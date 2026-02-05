"""
Simple test script to verify Firebase connectivity
"""
import os
import sys
from pathlib import Path

# Add the current directory to path
sys.path.insert(0, str(Path(__file__).parent))

import firebase_admin
from firebase_admin import credentials, firestore
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_firebase_connection():
    """Test Firebase Firestore connectivity"""
    try:
        logger.info("Testing Firebase connection...")
        
        # Initialize Firebase
        cred = credentials.Certificate('service-account-key.json')
        firebase_admin.initialize_app(cred, {
            'projectId': 'belnafinanzas-c92f7',
            'storageBucket': 'belnafinanzas-c92f7.firebasestorage.app'
        })
        
        logger.info("Firebase initialized")
        
        # Test Firestore connection with timeout
        db = firestore.client()
        logger.info("Firestore client created")
        
        # Try a simple query
        logger.info("Testing simple query...")
        households_ref = db.collection('households').limit(1)
        docs = households_ref.stream()
        
        count = 0
        for doc in docs:
            count += 1
            logger.info(f"Found document: {doc.id}")
            
        logger.info(f"Query successful. Documents found: {count}")
        logger.info("✅ Firebase connection test PASSED")
        return True
        
    except Exception as e:
        logger.error(f"❌ Firebase connection test FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_firebase_connection()
    sys.exit(0 if success else 1)
