from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from app.core.supabase import get_supabase
from app.core.auth import get_current_user
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

router = APIRouter()

class ShoppingItem(BaseModel):
    id: Optional[str] = None
    name: str
    estimated_cost: int
    is_checked: bool = False
    month: str # YYYY-MM

@router.get("/shopping-list")
def get_shopping_list(
    month: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get extra shopping items for a specific month"""
    household_id = user['household_id']
    
    resp = supabase.table('shopping_list').select('*').eq('household_id', household_id).eq('month', month).execute()
    return resp.data

@router.post("/shopping-list")
def add_shopping_item(
    item: ShoppingItem,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Add a new item to the shopping list"""
    household_id = user['household_id']
    
    item_data = item.dict(exclude={'id'})
    item_data['household_id'] = household_id
    
    resp = supabase.table('shopping_list').insert(item_data).execute()
    return resp.data[0] if resp.data else {"success": True}

@router.delete("/shopping-list/{item_id}")
def delete_shopping_item(
    item_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    household_id = user['household_id']
    supabase.table('shopping_list').delete().eq('id', item_id).eq('household_id', household_id).execute()
    return {"success": True}
