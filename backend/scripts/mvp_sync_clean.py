
import sys
import os
from datetime import datetime, date

# Path setup 
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.firebase import initialize_firebase, get_firestore

def sync():
    initialize_firebase()
    db = get_firestore()
    h_id = "household_1"
    
    # 1. Commitments (structural list)
    target_commitments = [
        {"name": "Arriendo", "amount": 600000, "cat": "hogar"},
        {"name": "Luz", "amount": 259300, "cat": "hogar"},
        {"name": "Agua", "amount": 79850, "cat": "hogar"},
        {"name": "Internet", "amount": 47000, "cat": "hogar"},
        {"name": "Unipay", "amount": 317817, "cat": "tarjetas"},
        {"name": "Cencosud 1", "amount": 120000, "cat": "tarjetas"},
        {"name": "Cencosud 2", "amount": 70000, "cat": "tarjetas"},
        {"name": "Youtube", "amount": 11000, "cat": "suscripciones"},
        {"name": "Ale", "amount": 26690, "cat": "otros"},
        {"name": "Sacros 1", "amount": 11534, "cat": "hogar"},
        {"name": "Sacros 2", "amount": 8854, "cat": "hogar"},
        {"name": "Entel", "amount": 42330, "cat": "servicios"},
        {"name": "Wom", "amount": 36449, "cat": "servicios"},
        {"name": "Agustín", "amount": 300000, "cat": "otros"},
        {"name": "Google", "amount": 21700, "cat": "servicios"},
        {"name": "Joaquín", "amount": 109923, "cat": "otros"},
        {"name": "Bencina", "amount": 100000, "cat": "transporte"},
        {"name": "Veritas", "amount": 29289, "cat": "servicios"},
        {"name": "Mercadolibre Carlos", "amount": 26411, "cat": "tarjetas"},
        {"name": "Mercadolibre Ana", "amount": 13330, "cat": "tarjetas"},
    ]
    
    # Clean Commitments
    print("Clearing irrelevant commitments...")
    comm_ref = db.collection('households').document(h_id).collection('commitments')
    for doc in comm_ref.stream():
        doc.reference.delete()
        
    for c in target_commitments:
        print(f"Adding: {c['name']}")
        comm_ref.add({
            'name': c['name'],
            'amount': c['amount'],
            'flow_category': c['cat'],
            'frequency': 'monthly',
            'next_date': '2026-03-05',
            'created_at': datetime.now()
        })

    # 2. Incomes 
    # Target: ONLY Sueldo Febrero for March.
    print("Clearing incomes...")
    inc_ref = db.collection('households').document(h_id).collection('incomes')
    for doc in inc_ref.stream():
        doc.reference.delete()
        
    inc_ref.add({
        'name': 'Sueldo Febrero',
        'amount': 1732286,
        'frequency': 'one_time',
        'is_variable': True,
        'month': '2026-03',
        'next_date': '2026-03-01',
        'created_at': datetime.now()
    })

    print("SYNC FINISHED. API results should be pure now.")

if __name__ == "__main__":
    sync()
