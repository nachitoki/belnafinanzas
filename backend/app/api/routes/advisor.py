from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.core.supabase import get_supabase
from app.core.auth import get_current_user
from app.services.ai_advisor import AIAdvisorService
from supabase import Client

router = APIRouter()
ai_advisor = AIAdvisorService()

class QuickTransactionRequest(BaseModel):
    text: str

@router.post("/interpret")
async def interpret_transaction(
    request: QuickTransactionRequest,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Usa IA para interpretar un texto y sugerir la transacción.
    """
    try:
        # 1. Obtener categorías del hogar para contexto
        categories = supabase.table("categories").select("id, name").eq("household_id", user["household_id"]).execute().data
        
        # 2. Interpretar con Gemini
        suggestion = await ai_advisor.categorize_text(request.text, categories)
        
        if not suggestion:
            raise HTTPException(status_code=500, detail="El Asesor no pudo interpretar el texto.")
            
        return suggestion
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/confirm")
async def confirm_transaction(
    data: Dict[str, Any],
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """
    Guarda la transacción ya confirmada por el usuario.
    """
    try:
        data["household_id"] = user["household_id"]
        data["occurred_on"] = data.get("occurred_on") or datetime.utcnow().isoformat()
        
        res = supabase.table("transactions").insert(data).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
