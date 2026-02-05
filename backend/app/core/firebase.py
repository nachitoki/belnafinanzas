import firebase_admin
from firebase_admin import credentials, firestore, storage, auth
from google.cloud.firestore import Client
from google.cloud.storage import Bucket
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Global instances
_firestore_client: Client | None = None
_storage_bucket: Bucket | None = None


def initialize_firebase() -> None:
    """Initialize Firebase Admin SDK on application startup"""
    global _firestore_client, _storage_bucket
    
    if firebase_admin._apps:
        logger.info("Firebase already initialized")
        return
    
    try:
        # Initialize with service account credentials
        cred = credentials.Certificate(settings.google_application_credentials)
        firebase_admin.initialize_app(cred, {
            'projectId': settings.firebase_project_id,
            'storageBucket': settings.firebase_storage_bucket
        })
        
        # Create client instances
        _firestore_client = firestore.client()
        _storage_bucket = storage.bucket(settings.firebase_storage_bucket)
        
        logger.info(f"Firebase initialized for project: {settings.firebase_project_id}")
        logger.info(f"Using Storage Bucket: {settings.firebase_storage_bucket}")
        
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
        raise


def get_firestore() -> Client:
    """Get Firestore client instance (dependency injection)"""
    if _firestore_client is None:
        raise RuntimeError("Firestore not initialized. Call initialize_firebase() first.")
    return _firestore_client


def get_storage_bucket() -> Bucket:
    """Get Firebase Storage bucket instance (dependency injection)"""
    if _storage_bucket is None:
        raise RuntimeError("Storage bucket not initialized. Call initialize_firebase() first.")
    return _storage_bucket


def get_auth():
    """Get Firebase Auth instance"""
    return auth
