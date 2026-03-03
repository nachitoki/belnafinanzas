import os
from supabase import create_client, Client
from loguru import logger

_supabase_client: Client | None = None

def _init_supabase() -> Client | None:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        logger.warning("SUPABASE_URL or SUPABASE_KEY not found in environment")
        return None
        
    try:
        return create_client(url, key)
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None

def get_supabase() -> Client:
    """
    Get Supabase client singleton.
    Raises RuntimeError if not configured, so FastAPI returns proper error.
    """
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = _init_supabase()
    if _supabase_client is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Database not configured. Check SUPABASE_URL and SUPABASE_KEY.")
    return _supabase_client
