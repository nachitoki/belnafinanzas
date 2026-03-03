from supabase import create_client, Client
from app.core.config import settings
from loguru import logger

_supabase_client: Client | None = None

def _init_supabase() -> Client | None:
    url = settings.supabase_url
    key = settings.supabase_key
    
    logger.info(f"Supabase URL configured: {bool(url)} (len={len(url) if url else 0})")
    logger.info(f"Supabase KEY configured: {bool(key)} (len={len(key) if key else 0})")
    
    if not url or not key:
        logger.warning("SUPABASE_URL or SUPABASE_KEY not found in settings")
        return None
        
    try:
        client = create_client(url, key)
        logger.success(f"Supabase client initialized: {url}")
        return client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None

def get_supabase() -> Client:
    """
    Get Supabase client singleton.
    Raises HTTPException if not configured.
    """
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = _init_supabase()
    if _supabase_client is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Database not configured. Check SUPABASE_URL and SUPABASE_KEY.")
    return _supabase_client
