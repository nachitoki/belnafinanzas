"""
Check what receipts exist in Firestore
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import firebase_admin
from firebase_admin import credentials, firestore
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_receipts():
    """Check receipts in Firestore"""
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate('service-account-key.json')
            firebase_admin.initialize_app(cred, {
                'projectId': 'belnafinanzas-c92f7',
                'storageBucket': 'belnafinanzas-c92f7.firebasestorage.app'
            })
        
        db = firestore.client()
        
        # Check all households
        households = db.collection('households').stream()
        
        for household_doc in households:
            household_id = household_doc.id
            logger.info(f"\n=== Household: {household_id} ===")
            
            # Get receipts
            receipts_ref = db.collection('households').document(household_id).collection('receipts')
            receipts = receipts_ref.stream()
            
            count = 0
            for receipt_doc in receipts:
                count += 1
                data = receipt_doc.to_dict()
                logger.info(f"  Receipt {receipt_doc.id}:")
                logger.info(f"    Status: {data.get('status')}")
                logger.info(f"    Created: {data.get('created_at')}")
                logger.info(f"    Image URL: {data.get('image_url', 'N/A')[:100]}...")
                
            if count == 0:
                logger.info("  No receipts found")
            else:
                logger.info(f"  Total receipts: {count}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    check_receipts()
