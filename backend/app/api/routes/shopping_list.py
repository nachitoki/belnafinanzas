from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client as SupabaseClient
from app.core.supabase import get_supabase
from app.core.auth import get_current_user
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class ShoppingItem(BaseModel):
    id: Optional[str] = None
    name: str
    estimated_cost: int
    quantity: int = 1
    is_checked: bool = False
    month: str # YYYY-MM

@router.get("/shopping-list/suggestions")
def get_shopping_suggestions(
    q: str = "",
    user: dict = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase)
):
    """Get unique suggestions based on previously added items"""
    try:
        household_id = user['household_id']
        # Query distinct names from previous items
        query = supabase.table('shopping_list').select('name, estimated_cost')\
            .eq('household_id', household_id)
            
        if q:
            query = query.ilike('name', f"%{q}%")
            
        response = query.order('updated_at', desc=True).limit(50).execute()
        
        # Deduplicate by name, keep most recent cost
        seen = set()
        suggestions = []
        for item in response.data:
            name_lower = item['name'].lower()
            if name_lower not in seen:
                seen.add(name_lower)
                suggestions.append({
                    "name": item['name'],
                    "estimated_cost": item['estimated_cost']
                })
        return suggestions
    except Exception as e:
        logger.error(f"Error fetching suggestions: {e}")
        return []

@router.get("/shopping-list")
def get_shopping_list(
    month: Optional[str] = None,
    user: dict = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase)
):
    """Get extra shopping items for a specific month (or all if not specified)"""
    try:
        household_id = user['household_id']
        
        query = supabase.table('shopping_list').select('*').eq('household_id', household_id)
        if month:
            query = query.eq('month', month)
            
        response = query.execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching shopping list: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/shopping-list")
def add_shopping_item(
    item: ShoppingItem,
    user: dict = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase)
):
    """Add a new item to the shopping list"""
    try:
        household_id = user['household_id']
        item_data = item.model_dump() if hasattr(item, 'model_dump') else item.dict()
        item_data['household_id'] = household_id
        
        if not item_data.get('id'):
            item_data['id'] = str(uuid.uuid4())
            
        response = supabase.table('shopping_list').insert(item_data).execute()
        return response.data[0] if response.data else item_data
    except Exception as e:
        logger.error(f"Error adding shopping item: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/shopping-list/{item_id}")
def update_shopping_item(
    item_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase)
):
    """Update existing shopping item"""
    try:
        response = supabase.table('shopping_list').update(payload).eq('id', item_id).execute()
        return response.data[0] if response.data else {"id": item_id}
    except Exception as e:
        logger.error(f"Error updating shopping item: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/shopping-list/{item_id}")
def delete_shopping_item(
    item_id: str,
    user: dict = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase)
):
    try:
        supabase.table('shopping_list').delete().eq('id', item_id).execute()
        return {"success": True}
    except Exception as e:
        logger.error(f"Error deleting shopping item: {e}")
        raise HTTPException(status_code=500, detail=str(e))
