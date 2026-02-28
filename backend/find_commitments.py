import os, json
from google.cloud import firestore

os.environ['GOOGLE_APPLICATION_CREDENTIALS']='service-account-key.json'
db = firestore.Client()

households = db.collection('households').stream()
res = {}

for h in households:
    comm = [c.to_dict() for c in db.collection('households').document(h.id).collection('commitments').stream()]
    if comm:
        res[h.id] = comm

with open('all_commitments.json', 'w', encoding='utf-8') as f:
    json.dump(res, f, default=str, indent=2, ensure_ascii=False)

print("DONE")
