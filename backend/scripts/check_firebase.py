import os
import sys
import firebase_admin
from firebase_admin import credentials, firestore
from loguru import logger

# Setup path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def main():
    key_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'prod-credentials.json')
    if not os.path.exists(key_path):
        key_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'service-account-key.json')
    
    if not os.path.exists(key_path):
        logger.error(f"Credentials not found at {key_path}")
        return

    if not firebase_admin._apps:
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    households = list(db.collection('households').stream())
    logger.info(f"Firebase: Encontrados {len(households)} households")
    
    for hh in households:
        data = hh.to_dict()
        name = data.get('name', 'N/A')
        incomes = len(list(hh.reference.collection('incomes').stream()))
        commitments = len(list(hh.reference.collection('commitments').stream()))
        logger.info(f" - Household: {name} (ID: {hh.id})")
        logger.info(f"   * Incomes: {incomes}")
        logger.info(f"   * Commitments: {commitments}")

if __name__ == "__main__":
    main()
