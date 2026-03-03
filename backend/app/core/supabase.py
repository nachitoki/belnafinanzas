from supabase import create_client, Client
from app.core.config import settings
from loguru import logger
import traceback

_supabase_client: Client | None = None

def _init_supabase() -> Client | None:
    url = settings.supabase_url
    key = settings.supabase_key
    
    # Log lengths for debugging without exposing keys
    logger.info(f"Supabase init attempt: URL_LEN={len(url) if url else 0}, KEY_LEN={len(key) if key else 0}")
    
    if not url or not key:
        return None
        
    try:
        # Importante: Asegurarse de que no tengan espacios en blanco
        client = create_client(url.strip(), key.strip())
        logger.success("Supabase client initialized successfully")
        return client
    except Exception as e:
        error_msg = f"Supabase create_client FAIL: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        # Guardamos el error en un sitio accesible para el debug
        return error_msg # Retornamos el string para identificar el error

def get_supabase() -> Client:
    global _supabase_client
    
    if _supabase_client is None or isinstance(_supabase_client, str):
        _supabase_client = _init_supabase()
        
    if _supabase_client is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Supabase not configured (URL or KEY missing)")
    
    if isinstance(_supabase_client, str):
        from fastapi import HTTPException
        # Si es un string, es el mensaje de error de la excepción
        raise HTTPException(status_code=500, detail=_supabase_client)
        
    return _supabase_client
