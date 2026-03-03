from firebase_admin import auth
from fastapi import Header, HTTPException, Depends
from app.core.supabase import get_supabase
from app.core.config import settings
from supabase import Client
import logging
import uuid

logger = logging.getLogger(__name__)


def _fb2uuid(fb_id: str) -> str:
    """Same deterministic conversion as migration script"""
    if not fb_id:
        return None
    try:
        uuid_obj = uuid.UUID(fb_id)
        return str(uuid_obj)
    except ValueError:
        return str(uuid.uuid5(uuid.NAMESPACE_OID, fb_id))


async def get_current_user(
    authorization: str = Header(None),
    supabase: Client = Depends(get_supabase)
) -> dict:
    """
    Verify Firebase ID token and return user data from Supabase
    """
    # DEV BYPASS: Allow mock user only in development
    if not authorization:
        if settings.is_development:
            logger.warning("No auth header - using MOCK USER for development")
            # Look up the first household in Supabase for dev
            resp = supabase.table("households").select("id").limit(1).execute()
            hh_id = resp.data[0]["id"] if resp.data else "household_1"
            return {
                'id': 'user_dev',
                'email': 'dev@example.com',
                'household_id': hh_id,
                'name': 'Developer'
            }
        raise HTTPException(status_code=401, detail="Missing authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    token = authorization.split("Bearer ")[1]
    
    try:
        # Verify Firebase ID token (still using Firebase Auth for token verification)
        decoded_token = auth.verify_id_token(token)
        user_id = decoded_token['uid']
        
        # Convert Firebase UID to UUID for Supabase lookup
        user_uuid = _fb2uuid(user_id)
        
        # Fetch user from Supabase
        resp = supabase.table('users').select('*').eq('id', user_uuid).execute()
        
        if not resp.data:
            # Try original Firebase ID as fallback
            resp = supabase.table('users').select('*').eq('id', user_id).execute()
            
        if not resp.data:
            raise HTTPException(
                status_code=403,
                detail="User not linked to household. Contact administrator."
            )
        
        user_data = resp.data[0]
        user_data['id'] = user_data.get('id', user_uuid)
        
        logger.info(f"User authenticated: {user_id} (household: {user_data.get('household_id')})")
        
        return user_data
        
    except auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    except auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Expired authentication token")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")
