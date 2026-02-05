from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, date
from google.cloud.firestore import Client
from google.cloud.storage import Bucket
from app.core.firebase import get_firestore, get_storage_bucket
from app.core.auth import get_current_user
from app.services.storage import StorageService
from app.schemas.receipt import (
    ReceiptUploadResponse,
    ReceiptDetail,
    ReceiptItemDetail,
    ReceiptConfirmRequest,
    ReceiptConfirmResponse
)
from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
_CACHE = {"ts": None, "data": None}
_CACHE_TTL_SECONDS = 60

def _to_iso(value) -> str:
    if value is None:
        return ''
    if hasattr(value, 'isoformat'):
        try:
            return value.isoformat()
        except Exception:
            pass
    return str(value)

def _store_exists(db: Client, household_id: str, store_name: str) -> bool:
    if not store_name:
        return False
    stores_ref = db.collection('households').document(household_id).collection('stores')
    if list(stores_ref.where('name', '==', store_name).limit(1).stream()):
        return True
    if list(stores_ref.where('legal_names', 'array_contains', store_name).limit(1).stream()):
        return True
    if list(stores_ref.where('aliases', 'array_contains', store_name).limit(1).stream()):
        return True
    return False

def _should_auto_confirm(extracted_data: dict, db: Client, household_id: str) -> bool:
    store_info = extracted_data.get('store', {}) if isinstance(extracted_data, dict) else {}
    store_name = store_info.get('name') or extracted_data.get('store_name')
    if not store_name:
        return False
    if not extracted_data.get('total'):
        return False
    if not extracted_data.get('date'):
        return False
    confidence = extracted_data.get('confidence_overall') or extracted_data.get('confidence') or 0
    if confidence < 0.6:
        return False
    if store_info.get('method') == 'inferred' and (store_info.get('confidence') or 0) < 0.7:
        return False
    if not _store_exists(db, household_id, store_name):
        return False
    return True


@router.get("/receipts", response_model=List[ReceiptDetail])
def list_receipts(
    limit: int = 20,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    """List recent receipts"""
    household_id = user['household_id']

    now = datetime.utcnow()
    if _CACHE["ts"] and _CACHE["data"]:
        if (now - _CACHE["ts"]).total_seconds() < _CACHE_TTL_SECONDS:
            return _CACHE["data"]
    
    receipts_ref = db.collection('households').document(household_id)\
        .collection('receipts')\
        .order_by('created_at', direction='DESCENDING')\
        .limit(limit)
        
    docs = receipts_ref.stream()
    result = []
    
    for doc in docs:
        data = doc.to_dict()
        if data.get('status') == 'rejected':
            continue
        extracted = data.get('extracted_json', {})
        extracted_store = extracted.get('store', {}) if isinstance(extracted, dict) else {}
        store_name = data.get('store_name') or extracted.get('store_name') or extracted_store.get('name')
        
        # Basic mapping to schema
        # Note: listing items for all receipts might be heavy, sending empty list for summary view
        # Client should fetch individual receipt for full details
        
        result.append(ReceiptDetail(
            id=doc.id,
            status=data.get('status', 'unknown'),
            image_url=data.get('image_url', ''),
            store_name=store_name,  # Prefer confirmed data, then extracted
            store_id=data.get('store_id'),
            date=_to_iso(data.get('occurred_on')),
            total=data.get('total'),
            items=[], # Empty for list view optimization
            created_at=_to_iso(data.get('created_at')),
            updated_at=_to_iso(data.get('updated_at'))
        ))
        
    _CACHE["ts"] = now
    _CACHE["data"] = result
    return result


@router.post("/receipts", response_model=ReceiptUploadResponse)
def upload_receipt(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore),
    bucket: Bucket = Depends(get_storage_bucket)
):
    """
    Upload receipt image and process with AI extraction
    
    Flow:
    1. Validate user authentication
    2. Generate receipt_id
    3. Upload image to Firebase Storage
    4. Create receipt document in Firestore with status=uploaded
    5. Process with AI extraction immediately
    6. Return receipt_id with extracted data
    
    Note: Processing happens synchronously for immediate user feedback
    """
    from app.services.ai_extractor import GeminiVisionExtractor
    from app.core.config import settings
    
    household_id = user['household_id']
    receipt_id = str(uuid.uuid4())
    
    logger.info(f"Uploading receipt for household {household_id}, receipt_id: {receipt_id}")
    
    try:
        # Upload to Firebase Storage
        storage_service = StorageService(bucket)
        image_url, image_path = storage_service.upload_receipt_image(
            file=file,
            household_id=household_id,
            receipt_id=receipt_id
        )
        
        # Create receipt document in Firestore
        receipt_data = {
            'image_url': image_url,
            'image_path': image_path,
            'status': 'processing',
            'created_by': user['id'],
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        receipt_ref = db.collection('households').document(household_id)\
            .collection('receipts').document(receipt_id)
        receipt_ref.set(receipt_data)
        
        logger.info(f"Receipt created, starting AI extraction: {receipt_id}")
        
        # Process with AI extraction immediately
        extractor = GeminiVisionExtractor(
            settings.gemini_api_key,
            settings.gemini_model,
            settings.gemini_fallback_model,
        )
        extraction_result = extractor.extract(image_url)
        
        if extraction_result.success:
            # Extract data from result
            extracted_data = extraction_result.data
            store_info = extracted_data.get('store', {})
            
            # Create items subcollection
            items_data = extracted_data.get('items', [])
            response_items = []
            
            if items_data:
                items_ref = receipt_ref.collection('items')
                for item in items_data:
                    item_doc = {
                        'name_raw': item.get('name', ''),
                        'qty': item.get('qty'),
                        'unit': item.get('unit'),
                        'line_total': item.get('line_total'),
                        'unit_price': item.get('line_total') / item.get('qty') if item.get('qty') and item.get('line_total') else None,
                        'confidence': item.get('confidence', 0.5),
                        'created_at': datetime.now()
                    }
                    _, doc_ref = items_ref.add(item_doc)
                    
                    response_items.append(ReceiptItemDetail(
                        id=doc_ref.id,
                        name_raw=item_doc['name_raw'],
                        qty=item_doc['qty'] or 1.0,
                        unit=item_doc['unit'],
                        line_total=item_doc['line_total'],
                        unit_price=item_doc['unit_price'],
                        confidence=item_doc['confidence'],
                        product_id=None
                    ))
            
            # Update receipt with extracted data
            receipt_ref.update({
                'status': 'extracted',
                'extracted_json': extracted_data,
                'store_name': store_info.get('name'),
                'total': extracted_data.get('total'),
                'occurred_on': extracted_data.get('date'),
                'updated_at': datetime.now()
            })
            
            logger.info(f"Receipt {receipt_id} extracted successfully: {store_info.get('name')}, ${extracted_data.get('total')}")

            # Auto-confirm if extraction looks reliable
            if _should_auto_confirm(extracted_data, db, household_id):
                try:
                    from app.services.receipt_processor import ReceiptProcessor
                    processor = ReceiptProcessor(db)
                    processor.confirm_receipt(
                        receipt_id=receipt_id,
                        household_id=household_id,
                        corrections={
                            'store_name': store_info.get('name') or extracted_data.get('store_name'),
                            'date': extracted_data.get('date'),
                            'total': extracted_data.get('total')
                        },
                        user_id=user['id']
                    )
                    return ReceiptUploadResponse(
                        receipt_id=receipt_id,
                        status='confirmed',
                        image_url=image_url,
                        merchant=store_info.get('name'),
                        total=extracted_data.get('total'),
                        date=extracted_data.get('date'),
                        items=response_items
                    )
                except Exception as e:
                    logger.warning(f"Auto-confirm failed for {receipt_id}: {e}")
                    receipt_ref.update({
                        'status': 'needs_review',
                        'updated_at': datetime.now()
                    })

            # Return with extracted data for immediate display (manual review)
            return ReceiptUploadResponse(
                receipt_id=receipt_id,
                status='needs_review',
                image_url=image_url,
                merchant=store_info.get('name'),
                total=extracted_data.get('total'),
                date=extracted_data.get('date'),
                items=response_items
            )
        else:
            # Extraction failed
            logger.warning(f"Receipt {receipt_id} extraction failed: {extraction_result.error}")
            receipt_ref.update({
                'status': 'needs_review',
                'extracted_json': {'error': extraction_result.error},
                'updated_at': datetime.now()
            })
            
            # Still return success for upload, but with needs_review status
            return ReceiptUploadResponse(
                receipt_id=receipt_id,
                status='needs_review',
                image_url=image_url
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process receipt: {e}")
        # Try to update status if receipt was created
        try:
            receipt_ref.update({
                'status': 'error',
                'error': str(e),
                'updated_at': datetime.now()
            })
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/receipts/{receipt_id}", response_model=ReceiptDetail)
def get_receipt(
    receipt_id: str,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore),
    bucket: Bucket = Depends(get_storage_bucket)
):
    """
    Get receipt details with extracted items
    
    Returns full receipt information including:
    - Basic info (store, date, total, status)
    - Extracted items with confidence scores
    - Image URL
    """
    household_id = user['household_id']
    
    try:
        # Get receipt document
        receipt_ref = db.collection('households').document(household_id)\
            .collection('receipts').document(receipt_id)
        receipt_doc = receipt_ref.get()
        
        if not receipt_doc.exists:
            raise HTTPException(status_code=404, detail="Receipt not found")
        
        receipt_data = receipt_doc.to_dict()
        
        # Get items subcollection
        items_ref = receipt_ref.collection('items')
        items_docs = items_ref.stream()
        
        items = []
        for item_doc in items_docs:
            item_data = item_doc.to_dict()
            items.append({
                'id': item_doc.id,
                'name_raw': item_data.get('name_raw', ''),
                'qty': item_data.get('qty'),
                'unit': item_data.get('unit'),
                'line_total': item_data.get('line_total'),
                'unit_price': item_data.get('unit_price'),
                'confidence': item_data.get('confidence', 0.0),
                'product_id': item_data.get('product_id')
            })
        
        # Build response
        extracted_json = receipt_data.get('extracted_json', {})
        
        image_url = receipt_data.get('image_url', '')
        image_path = receipt_data.get('image_path')
        if image_path:
            image_url = StorageService(bucket).generate_signed_url(image_path, days=7)

        return ReceiptDetail(
            id=receipt_id,
            status=receipt_data['status'],
            image_url=image_url,
            store_name=extracted_json.get('store_name'),
            store_id=receipt_data.get('store_id'),
            date=_to_iso(receipt_data.get('occurred_on')),
            total=receipt_data.get('total'),
            confidence=extracted_json.get('confidence'),
            items=items,
            created_at=_to_iso(receipt_data.get('created_at')),
            updated_at=_to_iso(receipt_data.get('updated_at'))
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get receipt: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve receipt: {str(e)}")


@router.post("/receipts/{receipt_id}/confirm", response_model=ReceiptConfirmResponse)
def confirm_receipt(
    receipt_id: str,
    confirmation: ReceiptConfirmRequest,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    """
    Confirm receipt and create transaction + product prices
    
    This is the critical endpoint that converts an extracted receipt into:
    1. Transaction record (expense)
    2. Product records (normalized)
    3. Product price records (for historical comparison)
    
    Implementation delegated to receipt_processor service
    """
    household_id = user['household_id']
    
    # Import here to avoid circular dependency
    from app.services.receipt_processor import ReceiptProcessor
    
    try:
        processor = ReceiptProcessor(db)
        result = processor.confirm_receipt(
            receipt_id=receipt_id,
            household_id=household_id,
            corrections=confirmation.dict(),
            user_id=user['id']
        )
        
        return ReceiptConfirmResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to confirm receipt: {e}")
        raise HTTPException(status_code=500, detail=f"Confirmation failed: {str(e)}")


@router.post("/receipts/{receipt_id}/reject")
def reject_receipt(
    receipt_id: str,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore),
    bucket: Bucket = Depends(get_storage_bucket)
):
    """
    Reject receipt (mark as rejected, optionally delete image)
    """
    household_id = user['household_id']
    
    try:
        receipt_ref = db.collection('households').document(household_id)\
            .collection('receipts').document(receipt_id)
        receipt_doc = receipt_ref.get()
        
        if not receipt_doc.exists:
            raise HTTPException(status_code=404, detail="Receipt not found")
        
        # Update status
        receipt_ref.update({
            'status': 'rejected',
            'updated_at': datetime.now()
        })
        
        logger.info(f"Receipt rejected: {receipt_id}")
        
        return {"success": True, "message": "Receipt rejected"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to reject receipt: {e}")
        raise HTTPException(status_code=500, detail=f"Rejection failed: {str(e)}")


@router.post("/receipts/manual", response_model=ReceiptConfirmResponse)
def create_manual_receipt(
    payload: ReceiptConfirmRequest,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    """
    Create a manual receipt (expense) without image image.
    Creates receipt doc and immediately confirms it to generate transaction.
    """
    household_id = user['household_id']
    receipt_id = str(uuid.uuid4())
    
    # Import here to avoid circular dependency
    from app.services.receipt_processor import ReceiptProcessor
    
    try:
        # 1. Create Receipt Doc
        receipt_data = {
            'image_url': None,
            'image_path': None,
            'status': 'confirmed', # Born confirmed
            'store_name': payload.store_name,
            'total': payload.total,
            'occurred_on': _to_iso(payload.date), # simple storage
            'created_by': user['id'],
            'created_at': datetime.now(),
            'updated_at': datetime.now(),
            'is_manual': True
        }
        
        receipt_ref = db.collection('households').document(household_id)\
            .collection('receipts').document(receipt_id)
        receipt_ref.set(receipt_data)
        
        # 2. Process/Confirm (creates transaction)
        processor = ReceiptProcessor(db)
        result = processor.confirm_receipt(
            receipt_id=receipt_id,
            household_id=household_id,
            corrections=payload.dict(),
            user_id=user['id']
        )
        
        return ReceiptConfirmResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create manual receipt: {e}")
        raise HTTPException(status_code=500, detail=f"Manual creation failed: {str(e)}")
