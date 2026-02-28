import os
from supabase import create_client, Client
from loguru import logger

def get_supabase() -> Client:
    """
    Initialize Supabase client using environment variables.
    """
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
