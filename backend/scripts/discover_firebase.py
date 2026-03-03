import os
import sys
import firebase_admin
from firebase_admin import credentials, firestore
from loguru import logger

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def main():
    key_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'prod-credentials.json')
    if not os.path.exists(key_path):
        key_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'service-account-key.json')
    
    if not firebase_admin._apps:
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()
    
    collections = db.collections()
    logger.info("Listando colecciones raíz de Firebase:")
    for col in collections:
        count = len(list(col.limit(5).stream()))
        logger.info(f" - {col.id} (muestra: {count} docs)")
        
        # Si es incomes o commitments a nivel raiz (raro pero posible)
        if col.id in ['incomes', 'commitments', 'transactions']:
             logger.warning(f"!!! Encontrada colección de datos a nivel RAÍZ: {col.id}")

if __name__ == "__main__":
    main()
