from firebase_admin import auth
from fastapi import Header, HTTPException, Depends
from app.core.firebase import get_firestore
from app.core.config import settings
from google.cloud.firestore import Client
import logging

logger = logging.getLogger(__name__)


async def get_current_user(
    authorization: str = Header(None),
    db: Client = Depends(get_firestore)
) -> dict:
    """
    Verify Firebase ID token and return user data
    
    Usage in routes:
        @router.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            household_id = user['household_id']
            ...
    """
    # DEV BYPASS: Allow mock user only in development
    if not authorization:
        if settings.is_development:
            logger.warning("No auth header - using MOCK USER for development")
            return {
                'id': 'user_dev',
                'email': 'dev@example.com',
                'household_id': 'household_1',  # Default test household
                'name': 'Developer'
            }
        raise HTTPException(status_code=401, detail="Missing authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    token = authorization.split("Bearer ")[1]
    
    try:
        # Verify Firebase ID token
        decoded_token = auth.verify_id_token(token)
        user_id = decoded_token['uid']
        
        # Fetch user document from Firestore
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            # First login - user needs to be linked to a household
            # This should be handled by an admin or setup flow
            raise HTTPException(
                status_code=403,
                detail="User not linked to household. Contact administrator."
            )
        
        user_data = user_doc.to_dict()
        user_data['id'] = user_id
        
        logger.info(f"User authenticated: {user_id} (household: {user_data.get('household_id')})")
        
        return user_data
        
    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Expired authentication token")
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")
