import os, json
from google.cloud import firestore

try:
    db = firestore.Client()
    h_id = 'H-CLAW-001'
    incomes = [d.to_dict() for d in db.collection('households').document(h_id).collection('incomes').stream()]
    commitments = [d.to_dict() for d in db.collection('households').document(h_id).collection('commitments').stream()]
    events = [d.to_dict() for d in db.collection('households').document(h_id).collection('events').stream()]

    out = {
        'incomes': incomes,
        'commitments': commitments,
        'events': events
    }
    
    with open('data_dump.json', 'w', encoding='utf-8') as f:
        json.dump(out, f, default=str, ensure_ascii=False, indent=2)
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {e}")
