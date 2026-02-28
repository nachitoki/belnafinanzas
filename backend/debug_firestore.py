#!/usr/bin/env python3
"""
Debug script to explore Firestore structure
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import firebase_admin
from firebase_admin import credentials, firestore

def main():
    key_path = os.path.join(os.path.dirname(__file__), 'service-account-key.json')
    
    if not firebase_admin._apps:
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    # List all households
    print("=== HOUSEHOLDS ===")
    households = db.collection('households').stream()
    for hh in households:
        hh_id = hh.id
        print(f"\nHousehold: {hh_id}")
        print(f"Data: {hh.to_dict()}")
        
        # List subcollections
        doc_ref = db.collection('households').document(hh_id)
        
        # Try to list known collections
        for coll_name in ['incomes', 'commitments', 'transactions', 'events', 'categories', 'recipes', 'meal_plans']:
            coll = doc_ref.collection(coll_name)
            docs = list(coll.limit(5).stream())
            print(f"  {coll_name}: {len(docs)} docs")
            for d in docs[:2]:
                print(f"    - {d.id}: {d.to_dict()}")

if __name__ == "__main__":
    main()
