from fastapi import APIRouter, Request, Header, HTTPException, Depends
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from app.services.telegram_service import TelegramService
from app.core.firebase import get_firestore, get_storage_bucket
from app.services.storage import StorageService
from app.services.receipt_processor import ReceiptProcessor
from app.services.ai_extractor import GeminiVisionExtractor
from app.services.price_service import PriceService
from app.core.config import settings
from google.cloud.firestore import Client
from google.cloud.storage import Bucket
import logging
import re
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

router = APIRouter()

# Singleton services
telegram_service = TelegramService.get_instance()

@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str = Header(None),
    db: Client = Depends(get_firestore),
    bucket: Bucket = Depends(get_storage_bucket)
):
    """
    Handle incoming Telegram updates (Webhook)
    """
    # 1. Verify Secret Token
    if x_telegram_bot_api_secret_token != settings.telegram_secret_token:
        if settings.is_development:
            logger.warning("Missing/invalid Telegram secret token (allowed in development)")
        else:
            logger.warning("Invalid Telegram secret token")
            raise HTTPException(status_code=401, detail="Invalid secret token")

    # 2. Parse Update
    try:
        data = await request.json()
        update = Update.de_json(data, telegram_service.bot)
    except Exception as e:
        logger.error(f"Failed to parse update: {e}")
        return {"status": "error"}

    # Handle Callbacks (Buttons)
    if update.callback_query:
        await _handle_callback_query(update, db)
        return {"status": "ok"}

    if not update.message:
        return {"status": "ok"} 

    user_id = update.message.from_user.id
    chat_id = update.message.chat_id
    text = update.message.text
    photos = update.message.photo
    media_group_id = update.message.media_group_id

    # Deduplicate media groups (simple in-memory check or just pick first processed)
    # For MVP: If it's a media group, we might process all, which is bad. 
    # But Telegram sends separate updates for each photo. 
    # Best practice: Check if we just processed this media_group_id.
    # Since we are stateless here, we will let it slide BUT we should advise user.
    # Actually, the user asked: "Can I upload more than 1?". The answer is YES, but we process them individually.

    # 3. Check User Link (Auth)
    user_doc = await _get_user_by_telegram_id(db, user_id)
    
    # Handle /start Command (Linking)
    if text and text.startswith("/start"):
        await _handle_start(chat_id, user_doc, text, db, user_id)
        return {"status": "ok"}

    if not user_doc:
        await telegram_service.send_message(
            chat_id, 
            "⛔ Tu cuenta no está vinculada.\n\nEscribe <code>/start tu.email@gmail.com</code> para comenzar.",
            parse_mode="HTML"
        )
        return {"status": "ok"}
    
    household_id = user_doc['household_id']

    # Handle /precio Command
    if text and text.startswith("/precio"):
        await _handle_price_command(chat_id, text, household_id, db)
        return {"status": "ok"}

    # 4. Handle Content
    try:
        if photos:
            await _handle_photo_receipt(photos[-1], household_id, user_doc['id'], bucket, db, chat_id)
        elif text:
            await _handle_text_message(text, household_id, user_doc['id'], db, chat_id)
            
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        await telegram_service.send_message(chat_id, "⚠️ Ocurrió un error procesando tu mensaje.")

    return {"status": "ok"}


async def _get_user_by_telegram_id(db: Client, telegram_id: int):
    """Find user in Firestore by telegram_user_id"""
    users_ref = db.collection('users')
    query = users_ref.where('telegram_user_id', '==', telegram_id).limit(1).stream()
    for doc in query:
        data = doc.to_dict()
        data['id'] = doc.id
        return data
    return None


async def _handle_start(chat_id: int, user_doc: dict, text: str, db: Client, telegram_id: int):
    """
    Handle /start command.
    MVP: If text has an email '/start email@example.com', link it.
    """
    if user_doc:
        await telegram_service.send_message(chat_id, "✅ Ya estás vinculado a tu familia.")
        return

    parts = text.split(" ")
    if len(parts) < 2:
        await telegram_service.send_message(
            chat_id, 
            "👋 ¡Hola! Para vincular tu cuenta, envíame tu email registrado:\n\n<code>/start mi.email@gmail.com</code>",
            parse_mode="HTML"
        )
        return

    email = parts[1].strip().lower()
    
    users_ref = db.collection('users')
    query = users_ref.where('email', '==', email).limit(1).stream()
    
    found_doc = None
    for doc in query:
        found_doc = doc
        break
    
    if found_doc:
        found_doc.reference.update({'telegram_user_id': telegram_id})
        await telegram_service.send_message(chat_id, f"✅ ¡Vinculado con éxito! Bienvenido, {found_doc.to_dict().get('name', 'Usuario')}.")
    else:
        await telegram_service.send_message(chat_id, f"❌ No encontré un usuario con el email <b>{email}</b>. Asegúrate de que el email esté en Firestore.")


async def _handle_photo_receipt(photo, household_id, user_id, bucket, db, chat_id):
    """Download photo -> Upload to Storage -> Create Receipt"""
    await telegram_service.send_message(chat_id, "🧾 Boleta recibida. Subiendo...")
    
    # 1. Get File URL
    file_id = photo.file_id
    file_path = await telegram_service.get_file_url(file_id)
    
    # 2. Download (Stream)
    import httpx
    async with httpx.AsyncClient() as client:
        res = await client.get(file_path)
        if res.status_code != 200:
            raise Exception("Failed to download image from Telegram")
        content = res.content

    # 3. Upload to Firebase
    logger.info(f"Uploading photo for household {household_id} to bucket {bucket.name}")
    receipt_id = str(uuid.uuid4())
    blob_path = f"households/{household_id}/receipts/{receipt_id}/telegram_upload.jpg"
    blob = bucket.blob(blob_path)
    
    from io import BytesIO
    file_obj = BytesIO(content)
    blob.upload_from_file(file_obj, content_type="image/jpeg")
    
    # Get signed URL (valid for 7 days) - required because bucket has Uniform Access enabled
    from datetime import timedelta
    image_url = blob.generate_signed_url(timedelta(days=7))

    # 4. Create Receipt Doc
    receipt_data = {
        'image_url': image_url,
        'status': 'uploaded',
        'created_by': user_id,
        'source': 'telegram',
        'created_at': datetime.now(),
        'updated_at': datetime.now()
    }
    db.collection('households').document(household_id)\
        .collection('receipts').document(receipt_id).set(receipt_data)

    await telegram_service.send_message(chat_id, "⏳ Procesando con IA...")
    
    # 5. Trigger Extraction (Immediate for MVP feel)
    try:
        extractor = GeminiVisionExtractor(settings.gemini_api_key, settings.gemini_model)
        result = extractor.extract(image_url)
        
        if result.success:
            db.collection('households').document(household_id)\
                .collection('receipts').document(receipt_id).update({
                    'status': 'extracted',
                    'extracted_json': result.data
                })
            
            # Extract store info with new schema
            store_info = result.data.get('store', {})
            store_name = store_info.get('name', 'Tienda desconocida')
            store_confidence = store_info.get('confidence', 0)
            date_str = result.data.get('date', 'Fecha desconocida')
            total = result.data.get('total', 0)
            is_blurry = result.data.get('is_blurry', False)
            # Message Logic based on Clarity and Store Confidence
            warning_msg = ""
            if is_blurry:
                warning_msg = "\n⚠️ <b>Imagen borrosa</b>. Revisa bien los datos."
            
            # Decide on info line
            if store_confidence < 0.6 or store_name == "Tienda desconocida" or store_name is None:
                info_line = "\n❓ <b>Nombre de tienda incierto</b>."
            else:
                info_line = "\nℹ️ La tienda fue inferida." if store_confidence < 0.7 else ""

            # UNIFIED KEYBOARD: Always offer all options
            keyboard = [
                [InlineKeyboardButton("✅ Confirmar", callback_data=f"rc:{receipt_id}")],
                [
                    InlineKeyboardButton("✏️ Corregir Monto (Pronto)", callback_data=f"fix:{receipt_id}"),
                    InlineKeyboardButton("🏪 Corregir Tienda", callback_data=f"fixs:{receipt_id}")
                ],
                [
                    InlineKeyboardButton("🔍 Ver detalle", callback_data=f"rd:{receipt_id}"),
                    InlineKeyboardButton("❌ Rechazar", callback_data=f"rj:{receipt_id}")
                ]
            ]
            
            # Subtle highlight if store is unknown: put store fix first (Optional, let's keep it uniform for now to avoid confusion)
            # Actually, user requested consistency. Let's keep the standard layout.
            
            msg_text = (
                f"🧾 <b>{store_name}</b>\n"
                f"📅 {date_str}\n"
                f"💰 Total: <b>${total:,}</b>\n"
                f"{info_line}{warning_msg}\n"
                f"¿Confirmamos esta boleta?"
            )
            
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await telegram_service.send_message(
                chat_id, 
                msg_text,
                parse_mode="HTML",
                reply_markup=reply_markup
            )
        else:
            await telegram_service.send_message(chat_id, "⚠️ No pude leer la boleta. Intenta sacando la foto más de cerca.")
    except Exception as e:
        logger.error(f"Auto-extraction failed: {e}")
        await telegram_service.send_message(chat_id, "⚠️ Error en la lectura IA, pero la boleta se subió correctamente.")



async def _handle_text_message(text, household_id, user_id, db, chat_id):
    """Handle text messages including correction replies"""
    
    # 0. Check if user is in 'waiting_for_store_name' state
    # Simplified state management using Firestore user doc or in-memory LRU (using Firestore for persistence)
    user_ref = db.collection('users').document(user_id)
    user_snap = user_ref.get()
    user_data = user_snap.to_dict()
    
    waiting_for = user_data.get('waiting_for') # e.g. {'action': 'fix_store', 'receipt_id': '123'}
    
    if waiting_for and waiting_for.get('action') == 'fix_store':
        receipt_id = waiting_for.get('receipt_id')
        new_store_name = text.strip()
        
        # Update receipt with new store name
        receipt_ref = db.collection('households').document(household_id).collection('receipts').document(receipt_id)
        receipt_doc = receipt_ref.get()
        
        if receipt_doc.exists:
            # Update the extracted JSON directly so confirmation picks it up
            receipt_data = receipt_doc.to_dict()
            extracted = receipt_data.get('extracted_json', {})
            if 'store' not in extracted: extracted['store'] = {}
            extracted['store']['name'] = new_store_name
            extracted['store']['method'] = 'user_correction'
            
            receipt_ref.update({'extracted_json': extracted})
            
            # Clear waiting state
            user_ref.update({'waiting_for': None})
            
            await telegram_service.send_message(chat_id, f"✅ Tienda actualizada a: <b>{new_store_name}</b>", parse_mode="HTML")
            
            # Re-show confirmation card
            await _reshow_confirmation(receipt_id, household_id, chat_id, db)
            return

    """Parse 'Monto Descripcion' or 'Descripcion Monto'"""
    amount = None
    description = None
    qty = None
    unit = None
    
    # 1. Try complex patterns with Qty/Unit (e.g. "Pan 2kg 5000" or "5000 Pan 2kg")
    # Pattern: Description (optional Qty+Unit) Amount
    match_complex = re.match(r'^(.+?)\s+(?:(\d+(?:\.\d+)?)\s*(kg|g|l|ml|un)\b)?\s*(\d+)$', text, re.IGNORECASE)
    # Pattern: Amount Description (optional Qty+Unit)
    match_inv_complex = re.match(r'^(\d+)\s+(.+?)(?:\s+(\d+(?:\.\d+)?)\s*(kg|g|l|ml|un)\b)?$', text, re.IGNORECASE)
    
    if match_complex:
        description = match_complex.group(1).strip()
        qty = float(match_complex.group(2)) if match_complex.group(2) else None
        unit = match_complex.group(3).lower() if match_complex.group(3) else None
        amount = int(match_complex.group(4))
    elif match_inv_complex:
        amount = int(match_inv_complex.group(1))
        description = match_inv_complex.group(2).strip()
        qty = float(match_inv_complex.group(3)) if match_inv_complex.group(3) else None
        unit = match_inv_complex.group(4).lower() if match_inv_complex.group(4) else None
    
    # 2. Fallback to simple patterns if complex failed
    if not amount:
        match_amount_first = re.match(r'^(\d+)\s+(.+)$', text)
        match_amount_last = re.match(r'^(.+)\s+(\d+)$', text)
        
        if match_amount_first:
            amount = int(match_amount_first.group(1))
            description = match_amount_first.group(2).strip()
        elif match_amount_last:
            description = match_amount_last.group(1).strip()
            amount = int(match_amount_last.group(2))
    
    if not amount:
        await telegram_service.send_message(chat_id, "❓ No entendí. Envía 'Monto Descripción' (ej: '5000 Almuerzo').")
        return

    # Create Transaction (simplified logic for MVP)
    house_ref = db.collection('households').document(household_id)
    
    # 1. Get first active Account
    accounts = list(house_ref.collection('accounts').where('is_active', '==', True).limit(1).stream())
    if not accounts:
        await telegram_service.send_message(chat_id, "❌ No tienes cuentas activas configuradas.")
        return
    account_id = accounts[0].id
    
    # 2. Get first expense Category
    categories = list(house_ref.collection('categories').where('kind', '==', 'expense').limit(1).stream())
    category_id = categories[0].id if categories else "otros"

    transaction_data = {
        'occurred_on': datetime.now(), 
        'amount': -float(amount),
        'description': description,
        'category_id': category_id,
        'account_id': account_id,
        'qty': qty,
        'unit': unit,
        'status': 'posted',
        'source': 'telegram',
        'created_by': user_id,
        'created_at': datetime.now()
    }
    
    display_desc = f"{description} ({qty}{unit})" if qty and unit else description
    
    house_ref.collection('transactions').add(transaction_data)
    await telegram_service.send_message(
        chat_id, 
        f"✅ <b>Gasto guardado</b>:\n📝 {display_desc}\n💰 ${amount:,}", 
        parse_mode="HTML"
    )

async def _handle_callback_query(update: Update, db: Client):
    """Handle button clicks from inline keyboards"""
    query = update.callback_query
    data = query.data
    chat_id = query.message.chat_id
    message_id = query.message.message_id
    telegram_user_id = query.from_user.id
    
    # Check user auth to get household_id
    user_doc = await _get_user_by_telegram_id(db, telegram_user_id)
    if not user_doc:
        await query.answer("❌ Cuenta no vinculada.")
        return
    
    household_id = user_doc['household_id']
    
    # Callback format: "act:receipt_id"
    parts = data.split(":")
    if len(parts) < 2:
        return
        
    action = parts[0]
    receipt_id = parts[1]
    
    if action == "rc": # confirm
        await _handle_receipt_confirm(receipt_id, household_id, chat_id, message_id, db, query)
    elif action == "rj": # reject
        await _handle_receipt_reject(receipt_id, household_id, chat_id, message_id, db, query)
    elif action == "rd": # detail
        await _handle_receipt_detail(receipt_id, household_id, chat_id, message_id, db, query)
    elif action == "fixs": # fix store name
        await _handle_receipt_fix_store(receipt_id, household_id, chat_id, message_id, db, query)

async def _handle_receipt_fix_store(receipt_id, household_id, chat_id, message_id, db, query):
    """Ask user for new store name"""
    user_id = query.from_user.id
    
    # Set user state to waiting_for fix_store
    user_ref = db.collection('users').where('telegram_user_id', '==', user_id).limit(1).stream()
    for doc in user_ref:
        doc.reference.update({
            'waiting_for': {
                'action': 'fix_store',
                'receipt_id': receipt_id
            }
        })
        break
    
    await query.answer()
    await telegram_service.send_message(
        chat_id, 
        "✍️ <b>Escribe el nombre correcto de la tienda:</b>",
        parse_mode="HTML"
    )

async def _reshow_confirmation(receipt_id, household_id, chat_id, db):
    """Re-send the confirmation card with updated data"""
    receipt_doc = db.collection('households').document(household_id)\
            .collection('receipts').document(receipt_id).get()
            
    if not receipt_doc.exists: return

    data = receipt_doc.to_dict()
    extracted = data.get('extracted_json', {})
    store_info = extracted.get('store', {})
    store_name = store_info.get('name', 'Tienda desconocida')
    date_str = extracted.get('date', 'Fecha desconocida')
    total = extracted.get('total', 0)
    
    # Standard Keyboard
    keyboard = [
        [InlineKeyboardButton("✅ Confirmar", callback_data=f"rc:{receipt_id}")],
        [
            InlineKeyboardButton("✏️ Corregir Monto (Pronto)", callback_data=f"fix:{receipt_id}"),
            InlineKeyboardButton("🏪 Corregir Tienda", callback_data=f"fixs:{receipt_id}")
        ],
        [
            InlineKeyboardButton("🔍 Ver detalle", callback_data=f"rd:{receipt_id}"),
            InlineKeyboardButton("❌ Rechazar", callback_data=f"rj:{receipt_id}")
        ]
    ]
    
    msg_text = (
        f"🧾 <b>{store_name}</b> (Corregido)\n"
        f"📅 {date_str}\n"
        f"💰 Total: <b>${total:,}</b>\n"
        f"¿Confirmamos ahora?"
    )
    
    await telegram_service.send_message(
        chat_id, 
        msg_text,
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def _handle_receipt_confirm(receipt_id, household_id, chat_id, message_id, db, query):
    """Confirm receipt and create transaction"""
    try:
        receipt_ref = db.collection('households').document(household_id)\
            .collection('receipts').document(receipt_id)
        receipt_doc = receipt_ref.get()
        
        if not receipt_doc.exists:
            await query.answer("❌ Boleta no encontrada.")
            return

        receipt_data = receipt_doc.to_dict()
        extracted = receipt_data.get('extracted_json', {})
        
        # Prepare corrections (as per ReceiptProcessor requirements)
        # Using extracted data as final if user just clicks "Confirm"
        store_info = extracted.get('store', {})
        corrections = {
            'store_name': store_info.get('name', 'Tienda desconocida'),
            'date': extracted.get('date', datetime.now().strftime("%Y-%m-%d")),
            'total': extracted.get('total', 0)
        }
        
        processor = ReceiptProcessor(db)
        result = processor.confirm_receipt(
            receipt_id=receipt_id,
            household_id=household_id,
            corrections=corrections,
            user_id="telegram_user" # We could improve this by passing real user_id
        )
        
        await telegram_service.edit_message(
            chat_id=chat_id,
            message_id=message_id,
            text=f"✅ <b>Boleta confirmada</b>\n🏪 {corrections['store_name']}\n💰 ${corrections['total']:,}\n\nGracias.",
            parse_mode="HTML"
        )
        await query.answer("Confirmado")
        
    except Exception as e:
        logger.error(f"Error confirmed receipt: {e}")
        await query.answer("❌ Error al confirmar.")

async def _handle_receipt_reject(receipt_id, household_id, chat_id, message_id, db, query):
    """Reject receipt"""
    try:
        db.collection('households').document(household_id)\
            .collection('receipts').document(receipt_id).update({
                'status': 'rejected',
                'updated_at': datetime.now()
            })
        
        await telegram_service.edit_message(
            chat_id=chat_id,
            message_id=message_id,
            text="❌ <b>Boleta rechazada</b>.",
            parse_mode="HTML"
        )
        await query.answer("Rechazado")
    except Exception as e:
        logger.error(f"Error rejecting receipt: {e}")
        await query.answer("❌ Error al rechazar.")

async def _handle_receipt_detail(receipt_id, household_id, chat_id, message_id, db, query):
    """Show detailed list of items"""
    try:
        receipt_ref = db.collection('households').document(household_id)\
            .collection('receipts').document(receipt_id)
        receipt_doc = receipt_ref.get()
        
        if not receipt_doc.exists:
            await query.answer("❌ Detalle no encontrado.")
            return

        receipt_data = receipt_doc.to_dict()
        extracted = receipt_data.get('extracted_json', {})
        items = extracted.get('items', [])
        
        if not items:
            await query.answer("Esta boleta no tiene ítems detectados.")
            return

        # Build items summary (show all items)
        summary_lines = []
        for item in items:
            name = item.get('name', 'Producto')
            qty = item.get('qty')
            unit = item.get('unit')
            total = item.get('line_total', 0)
            
            if qty and unit:
                # Calculate unit price for display if possible
                u_price = total / qty if qty > 0 else 0
                summary_lines.append(f"• {name} — {qty}{unit} → ${u_price:,.0f}/{unit}")
        if len(items) > 50: # Pre-check to avoid massive loops if possible, but summary logic needs loop
            pass 

        items_summary = "\n".join(summary_lines)

        if len(items_summary) > 3500: # Safety margin for msg length
            items_summary = f"{items_summary[:3500]}\n\n... (y {len(items) - 50} más)"
            
        detail_text = (
            f"<b>Detalle extraído</b>:\n\n"
            f"{items_summary}\n\n"
            f"({len(items)} productos)\n\n"
            f"¿Confirmamos esta boleta?"
        )
        
        keyboard = [
            [InlineKeyboardButton("✅ Confirmar", callback_data=f"rc:{receipt_id}")],
            [
                InlineKeyboardButton("🏪 Corregir Tienda", callback_data=f"fixs:{receipt_id}"),
                InlineKeyboardButton("❌ Rechazar", callback_data=f"rj:{receipt_id}")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        try:
            await telegram_service.edit_message(
                chat_id=chat_id,
                message_id=message_id,
                text=detail_text,
                parse_mode="HTML",
                reply_markup=reply_markup
            )
        except Exception as e_edit:
            # Fallback if edit fails (e.g. content too similar or too long)
            logger.warning(f"Could not edit message, sending new one: {e_edit}")
            await telegram_service.send_message(
                chat_id=chat_id,
                text=detail_text,
                parse_mode="HTML",
                reply_markup=reply_markup
            )
        await query.answer()
        
    except Exception as e:
        logger.error(f"Error showing receipt detail: {e}")
        await query.answer("❌ Error al cargar detalle.")

async def _handle_price_command(chat_id, text, household_id, db):
    """Handle /precio {query} command"""
    query_text = text.replace("/precio", "").strip()
    
    if not query_text:
        await telegram_service.send_message(
            chat_id, 
            "❓ ¿Qué producto quieres consultar?\nEjemplo: <code>/precio arroz</code>",
            parse_mode="HTML"
        )
        return

    try:
        price_service = PriceService(db)
        response_text = await price_service.get_price_comparison(query_text, household_id)
        
        await telegram_service.send_message(
            chat_id,
            response_text,
            parse_mode="HTML"
        )
    except Exception as e:
        logger.error(f"Error in /precio command: {e}")
        await telegram_service.send_message(chat_id, "⚠️ Error al consultar el precio.")
