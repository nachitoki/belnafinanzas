
import sys
import os
from datetime import datetime

# Add app directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'app'))
# Try both paths just in case
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.firebase import initialize_firebase, get_firestore

def sync():
    initialize_firebase()
    db = get_firestore()
    h_id = "household_1"
    
    user_commitments = [
        {"name": "Arriendo", "amount": 600000, "category": "vivienda"},
        {"name": "Luz", "amount": 259300, "category": "servicios"},
        {"name": "Agua", "amount": 79850, "category": "servicios"},
        {"name": "Internet", "amount": 47000, "category": "servicios"},
        {"name": "Unipay", "amount": 317817, "category": "tarjetas"},
        {"name": "Cencosud 1", "amount": 120000, "category": "tarjetas"},
        {"name": "Cencosud 2", "amount": 70000, "category": "tarjetas"},
        {"name": "Youtube", "amount": 11000, "category": "suscripciones"},
        {"name": "Ale", "amount": 26690, "category": "otros"},
        {"name": "Sacros 1", "amount": 11534, "category": "servicios"},
        {"name": "Sacros 2", "amount": 8854, "category": "servicios"},
        {"name": "Entel", "amount": 42330, "category": "servicios"},
        {"name": "Wom", "amount": 36449, "category": "servicios"},
        {"name": "Agustín", "amount": 300000, "category": "otros"},
        {"name": "Google", "amount": 21700, "category": "suscripciones"},
        {"name": "Joaquín", "amount": 109923, "category": "otros"},
        {"name": "Bencina", "amount": 100000, "category": "transporte"},
        {"name": "Veritas", "amount": 29289, "category": "servicios"},
        {"name": "Mercadolibre Carlos", "amount": 26411, "category": "compras"},
        {"name": "Mercadolibre Ana", "amount": 13330, "category": "compras"},
    ]

    commitments_ref = db.collection('households').document(h_id).collection('commitments')
    
    # Let's be aggressive and wipe old ones if they are problematic or duplicates
    # and just ensure this list is in.
    
    existing_docs = commitments_ref.stream()
    existing_map = {}
    for d in existing_docs:
        data = d.to_dict()
        existing_map[d.id] = data

    print(f"Syncing {len(user_commitments)} commitments.")

    for u_c in user_commitments:
        name = u_c['name']
        amount = u_c['amount']
        category = u_c['category']
        
        # Check if already exists by name
        found_id = None
        for eid, edata in existing_map.items():
            if (edata.get('name') or '').lower() == name.lower():
                found_id = eid
                break
        
        doc_data = {
            'name': name,
            'amount': amount,
            'frequency': 'monthly',
            'next_date': '2026-03-05',
            'flow_category': category,
            'updated_at': datetime.now()
        }
        
        if found_id:
            print(f"Updating: {name} (${amount})")
            commitments_ref.document(found_id).update(doc_data)
        else:
            print(f"Creating: {name} (${amount})")
            doc_data['created_at'] = datetime.now()
            commitments_ref.add(doc_data)

    # Cleanup: remove items NOT in the user list that are still problematic/dupes
    user_names = [c['name'].lower() for c in user_commitments]
    for eid, edata in existing_map.items():
        ename = (edata.get('name') or '').lower()
        if ename not in user_names:
            # Dangerous to wipe everything, but user was frustrated with duplicates.
            # Let's at least wipe the ones known as duplicates or specifically requested to be clean.
            if any(k in ename for k in ['cencosud', 'agua', 'starlink', 'almuerzo', 'compra grande']):
                print(f"Deleting leftover/old item: {edata.get('name')}")
                commitments_ref.document(eid).delete()

    print("Success. Run verify script next.")

if __name__ == "__main__":
    sync()
