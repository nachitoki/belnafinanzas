"""
Test the dashboard service directly to isolate the issue
"""
import sys
from pathlib import Path

# Add the current directory to path
sys.path.insert(0, str(Path(__file__).parent))

import firebase_admin
from firebase_admin import credentials, firestore
from app.services.dashboard_service import DashboardService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_dashboard_service():
    """Test dashboard service"""
    try:
        logger.info("Initializing Firebase...")
        
        # Initialize Firebase
        if not firebase_admin._apps:
            cred = credentials.Certificate('service-account-key.json')
            firebase_admin.initialize_app(cred, {
                'projectId': 'belnafinanzas-c92f7',
                'storageBucket': 'belnafinanzas-c92f7.firebasestorage.app'
            })
        
        db = firestore.client()
        logger.info("Firebase initialized")
        
        # Test dashboard service
        logger.info("Testing dashboard service...")
        service = DashboardService(db)
        
        household_id = "3YrfW0araoI8So0SNepX"
        logger.info(f"Fetching dashboard for household: {household_id}")
        
        result = service.get_dashboard_summary(household_id)
        
        logger.info(f"✅ Dashboard service test PASSED")
        logger.info(f"Result: {result}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Dashboard service test FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_dashboard_service()
    sys.exit(0 if success else 1)
