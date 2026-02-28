
import sys
import os
from google.cloud.firestore import Client

# Path setup 
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.firebase import initialize_firebase, get_firestore

def debug_data():
    initialize_firebase()
    db = get_firestore()
    h_id = "household_1"
    
    # Commitments
    print("--- COMMITMENTS DATA ---")
    comm_ref = db.collection('households').document(h_id).collection('commitments')
    for doc in comm_ref.stream():
        data = doc.to_dict()
        print(f"Name: {data['name']}")
        print(f"  Next Date: {data.get('next_date')}")
        print(f"  Last Paid: {data.get('last_paid_at')}")
        # print all keys just in case
        # print(f"  Keys: {list(data.keys())}")
        
if __name__ == "__main__":
    debug_data()
