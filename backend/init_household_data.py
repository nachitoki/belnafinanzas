"""
Initialize basic household data for development
Creates necessary collections: accounts, categories, etc.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def initialize_household_data():
    """Initialize basic household data"""
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate('service-account-key.json')
            firebase_admin.initialize_app(cred, {
                'projectId': 'belnafinanzas-c92f7',
                'storageBucket': 'belnafinanzas-c92f7.firebasestorage.app'
            })
        
        db = firestore.client()
        household_id = "household_1"  # Development household
        
        logger.info(f"Initializing data for household: {household_id}")
        
        # Create default account
        accounts_ref = db.collection('households').document(household_id).collection('accounts')
        existing_accounts = list(accounts_ref.limit(1).stream())
        
        if not existing_accounts:
            account_data = {
                'name': 'Cuenta Principal',
                'type': 'checking',
                'is_active': True,
                'balance': 0,
                'created_at': datetime.now()
            }
            _, account_ref = accounts_ref.add(account_data)
            logger.info(f"✅ Created default account: {account_ref.id}")
        else:
            logger.info("✅ Account already exists")
        
        # Create default categories
        categories_ref = db.collection('households').document(household_id).collection('categories')
        existing_categories = list(categories_ref.where('name', '==', 'Súper').limit(1).stream())
        
        if not existing_categories:
            categories_data = [
                {'name': 'Súper', 'kind': 'expense', 'icon': '🛒', 'created_at': datetime.now()},
                {'name': 'Transporte', 'kind': 'expense', 'icon': '🚗', 'created_at': datetime.now()},
                {'name': 'Servicios', 'kind': 'expense', 'icon': '💡', 'created_at': datetime.now()},
                {'name': 'Otros', 'kind': 'expense', 'icon': '📦', 'created_at': datetime.now()},
            ]
            
            for cat_data in categories_data:
                categories_ref.add(cat_data)
            
            logger.info(f"✅ Created {len(categories_data)} default categories")
        else:
            logger.info("✅ Categories already exist")
        
        logger.info("\n🎉 Household initialization complete!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = initialize_household_data()
    sys.exit(0 if success else 1)
