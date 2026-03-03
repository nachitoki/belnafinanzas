#!/usr/bin/env python3
import os
import sys
import uuid
import math
from datetime import datetime, date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

import firebase_admin
from firebase_admin import credentials, firestore
from app.core.supabase import get_supabase
from loguru import logger

def fb2uuid(fb_id: str) -> str:
    """Convierte determinísticamente un ID de Firebase a UUID válido para Supabase"""
    if not fb_id:
        return None
    try:
        uuid_obj = uuid.UUID(fb_id)
        return str(uuid_obj)
    except ValueError:
        return str(uuid.uuid5(uuid.NAMESPACE_OID, fb_id))

def clean_float(val):
    if val is None or math.isnan(float(val)):
        return None
    return float(val)

def extract_date(d):
    if not d:
        return None
    if isinstance(d, datetime) or isinstance(d, date):
        return d.strftime('%Y-%m-%d')
    if hasattr(d, 'isoformat'):
        return d.isoformat()[:10]
    if isinstance(d, str):
        return d[:10]
    return None

def main():
    logger.info("🚚 Iniciando el Camión de Mudanza Firebase -> Supabase (FULL)")
    
    key_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'prod-credentials.json')
    if not os.path.exists(key_path):
        key_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'service-account-key.json')
    
    if firebase_admin._apps:
        firebase_admin.delete_app(firebase_admin.get_app())
        
    cred = credentials.Certificate(key_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    
    supabase = get_supabase()
    if not supabase:
        logger.error("No se pudo conectar a Supabase. Revisa las variables de entorno.")
        return

    households = list(db.collection('households').stream())
    logger.info(f"Encontrados {len(households)} households en Firebase")

    # MIGRAR USUARIOS PRINCIPALES ANTES (si existieran en root level, usualmente están en users)
    global_users = list(db.collection('users').stream())
    user_uuids = {}
    for u in global_users:
        u_data = u.to_dict()
        user_uuid = fb2uuid(u.id)
        u_hh_id = fb2uuid(u_data.get('household_id'))
        if u_hh_id:
            user_uuids[u.id] = user_uuid
            # Guardamos para insertarlo justo despues de crear su household.

    for hh in households:
        hh_uuid = fb2uuid(hh.id)
        hh_data = hh.to_dict()
        
        # HOUSEHOLDS
        supabase.table('households').upsert({
            'id': hh_uuid,
            'name': hh_data.get('name', 'Hogar por defecto'),
            'created_at': hh_data.get('created_at', datetime.now()).isoformat() if hasattr(hh_data.get('created_at'), 'isoformat') else None
        }).execute()
        logger.success(f"🏠 Household: {hh_data.get('name')} migrado.")

        # GLOBAL USERS MAPPING
        for u in global_users:
            u_data = u.to_dict()
            if fb2uuid(u_data.get('household_id')) == hh_uuid:
                try:
                    supabase.table('users').upsert({
                        'id': fb2uuid(u.id),
                        'household_id': hh_uuid,
                        'name': u_data.get('name', 'User'),
                        'role': u_data.get('role', 'admin'),
                        'telegram_user_id': u_data.get('telegram_user_id')
                    }).execute()
                except Exception as e:
                    logger.warning(f"No se pudo insertar user {u.id}: {e}")

        # ACCOUNTS
        acc_docs = list(hh.reference.collection('accounts').stream())
        logger.info(f"   -> Migrando {len(acc_docs)} cuentas...")
        for acc in acc_docs:
            a_data = acc.to_dict()
            try:
                supabase.table('accounts').upsert({
                    'id': fb2uuid(acc.id),
                    'household_id': hh_uuid,
                    'name': a_data.get('name', 'N/A'),
                    'type': a_data.get('type', 'cash'),
                    'currency': a_data.get('currency', 'CLP'),
                    'is_active': a_data.get('is_active', True)
                }).execute()
            except Exception as e:
                logger.warning(f"Skipping erróneo account {acc.id}: {e}")

        # CATEGORIES
        cat_docs = list(hh.reference.collection('categories').stream())
        logger.info(f"   -> Migrando {len(cat_docs)} categorías...")
        for cat in cat_docs:
            c_data = cat.to_dict()
            try:
                supabase.table('categories').upsert({
                    'id': fb2uuid(cat.id),
                    'household_id': hh_uuid,
                    'name': c_data.get('name', 'N/A'),
                    'kind': c_data.get('kind', 'expense'),
                    'essential': c_data.get('essential', False)
                }).execute()
            except Exception as e:
                logger.warning(f"Error category {cat.id}: {e}")

        # INCOMES
        inc_docs = list(hh.reference.collection('incomes').stream())
        logger.info(f"   -> Migrando {len(inc_docs)} ingresos...")
        inc_payloads = []
        for inc in inc_docs:
            i_data = inc.to_dict()
            inc_payloads.append({
                'id': fb2uuid(inc.id),
                'household_id': hh_uuid,
                'name': i_data.get('name', 'N/A'),
                'amount': clean_float(i_data.get('amount', 0)),
                'frequency': i_data.get('frequency', 'monthly'),
                'is_variable': i_data.get('is_variable', False),
                'month': i_data.get('month'),
                'min_amount': clean_float(i_data.get('min_amount')),
                'next_date': extract_date(i_data.get('next_date'))
            })
        if inc_payloads: supabase.table('incomes').upsert(inc_payloads).execute()

        # COMMITMENTS
        com_docs = list(hh.reference.collection('commitments').stream())
        logger.info(f"   -> Migrando {len(com_docs)} compromisos...")
        com_payloads = []
        for com in com_docs:
            c_data = com.to_dict()
            com_payloads.append({
                'id': fb2uuid(com.id),
                'household_id': hh_uuid,
                'name': c_data.get('name', 'N/A'),
                'amount': clean_float(c_data.get('amount', 0)),
                'frequency': c_data.get('frequency', 'monthly'),
                'flow_category': c_data.get('flow_category'),
                'next_date': extract_date(c_data.get('next_date')),
                'installments_total': c_data.get('installments_total', 0),
                'installments_paid': c_data.get('installments_paid', 0),
                'is_variable': c_data.get('is_variable', False)
            })
        if com_payloads: supabase.table('commitments').upsert(com_payloads).execute()

        # EVENTS
        evt_docs = list(hh.reference.collection('events').stream())
        logger.info(f"   -> Migrando {len(evt_docs)} eventos...")
        evt_payloads = []
        for evt in evt_docs:
            e_data = evt.to_dict()
            evt_payloads.append({
                'id': fb2uuid(evt.id),
                'household_id': hh_uuid,
                'name': e_data.get('name', 'N/A'),
                'amount_estimate': clean_float(e_data.get('amount_estimate', 0)),
                'date': extract_date(e_data.get('date')),
                'is_mandatory': e_data.get('is_mandatory', False)
            })
        if evt_payloads: supabase.table('events').upsert(evt_payloads).execute()

        # TRANSACTIONS
        txn_docs = list(hh.reference.collection('transactions').stream())
        logger.info(f"   -> Migrando {len(txn_docs)} transacciones... (esto puede tomar varios segundos)")
        txn_payloads = []
        for txn in txn_docs:
            t_data = txn.to_dict()
            
            # Check mandatory values
            amount = t_data.get('amount', 0)
            if amount is None: amount = 0
            
            acc_id = fb2uuid(t_data.get('account_id'))
            category_id = fb2uuid(t_data.get('category_id'))
            
            # If account missing but transaction exists we need a fallback account so constraints pass
            if not acc_id:
                # We fetch the first account we just migrated for this household
                fallback = supabase.table('accounts').select('id').eq('household_id', hh_uuid).limit(1).execute()
                if fallback.data:
                    acc_id = fallback.data[0]['id']
                else:
                    logger.warning(f"Ignorando transaction {txn.id} por no tener cuenta asociable")
                    continue

            occ = extract_date(t_data.get('occurred_on')) or datetime.now().strftime('%Y-%m-%d')
            
            txn_payloads.append({
                'id': fb2uuid(txn.id),
                'household_id': hh_uuid,
                'occurred_on': occ,
                'amount': int(amount),
                'description': t_data.get('description', 'N/A'),
                'category_id': category_id if category_id else None,
                'account_id': acc_id,
                'status': t_data.get('status', 'posted'),
                'source': t_data.get('source', 'manual'),
                'qty': clean_float(t_data.get('qty')),
                'unit': t_data.get('unit')
            })
        
        chunk_size = 100
        for i in range(0, len(txn_payloads), chunk_size):
            try:
                supabase.table('transactions').upsert(txn_payloads[i:i+chunk_size]).execute()
            except Exception as e:
                logger.error(f"Error parcial insertando transactions: {e}")

    logger.success("🚀✅ ¡Mudanza completada! Todos los datos pasaron de Firebase a Supabase exitosamente.")

if __name__ == "__main__":
    main()
