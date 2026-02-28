#!/usr/bin/env python3
import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

key_path = os.path.join(os.path.dirname(__file__), 'service-account-key.json')
cred = credentials.Certificate(key_path)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

households = list(db.collection('households').stream())
res = []

for hh in households:
    h_data = hh.to_dict()
    comm_docs = list(db.collection('households').document(hh.id).collection('commitments').stream())
    comms = [c.to_dict() for c in comm_docs]
    
    events_docs = list(db.collection('households').document(hh.id).collection('events').stream())
    events = [e.to_dict() for e in events_docs]
    
    incomes_docs = list(db.collection('households').document(hh.id).collection('incomes').stream())
    incomes = [i.to_dict() for i in incomes_docs]
    
    res.append({
        "id": hh.id,
        "name": h_data.get("name"),
        "commitments": comms,
        "events": events,
        "incomes": incomes
    })

with open("all_households_data.json", "w", encoding="utf-8") as f:
    json.dump(res, f, default=str, indent=2, ensure_ascii=False)

print("SUCCESS: all_households_data.json created")
