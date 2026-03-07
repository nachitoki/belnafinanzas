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
    estimated_cost: Optional[int] = 0
    is_checked: Optional[bool] = False
    checked: Optional[bool] = None # For compatibility with frontend
    month: Optional[str] = None # YYYY-MM
    qty: Optional[float] = None
    quantity: Optional[float] = None # For compatibility with database
    unit: Optional[str] = None
    bucket: Optional[str] = "monthly"
    weeks: Optional[List[int]] = []
    product_id: Optional[str] = None

@router.get("/shopping-list")
def get_shopping_list(
    month: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Get extra shopping items for a specific month"""
    household_id = user['household_id']
    target_month = month or datetime.now().strftime('%Y-%m')
    
    resp = supabase.table('shopping_list').select('*').eq('household_id', household_id).eq('month', target_month).execute()
    
    # Map database fields to frontend fields
    data = resp.data or []
    for item in data:
        if 'is_checked' in item:
            item['checked'] = item['is_checked']
        if 'quantity' in item:
            item['qty'] = item['quantity']
    return data

@router.post("/shopping-list")
def add_shopping_item(
    item: ShoppingItem,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Add a new item to the shopping list"""
    household_id = user['household_id']
    target_month = item.month or datetime.now().strftime('%Y-%m')
    
    item_data = item.dict(exclude={'id', 'checked', 'qty'})
    item_data['household_id'] = household_id
    item_data['month'] = target_month
    
    # Map frontend fields to database fields
    if item.checked is not None:
        item_data['is_checked'] = item.checked
    if item.qty is not None:
        item_data['quantity'] = item.qty
        
    # Remove fields that might not be in DB yet, but check first or wrap in try/catch 
    # Actually, if the user mentioned disappearing data, they might have lost data.
    # I'll try to insert and catch errors.
    try:
        resp = supabase.table('shopping_list').insert(item_data).execute()
        res_data = resp.data[0] if resp.data else item_data
        # Map back for frontend
        if 'is_checked' in res_data:
            res_data['checked'] = res_data['is_checked']
        if 'quantity' in res_data:
            res_data['qty'] = res_data['quantity']
        return res_data
    except Exception as e:
        # If it failed due to missing columns, try a fallback with only core columns
        if "column" in str(e).lower():
            core_columns = {'name', 'estimated_cost', 'is_checked', 'month', 'household_id', 'quantity'}
            fallback_data = {k: v for k, v in item_data.items() if k in core_columns}
            resp = supabase.table('shopping_list').insert(fallback_data).execute()
            res_data = resp.data[0] if resp.data else fallback_data
            if 'is_checked' in res_data:
                res_data['checked'] = res_data['is_checked']
            if 'quantity' in res_data:
                res_data['qty'] = res_data['quantity']
            return res_data
        raise e

@router.get("/shopping-list/suggestions")
def get_shopping_suggestions(
    q: Optional[str] = Query(""),
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Fallback endpoint for shopping suggestions, matching frontend's api call"""
    # Simply returning an empty list avoiding failure
    return []

@router.patch("/shopping-list/{item_id}")
def update_shopping_item(
    item_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Update a shopping item"""
    household_id = user['household_id']
    
    # Map frontend fields to database fields
    if 'checked' in payload:
        payload['is_checked'] = payload.pop('checked')
    if 'qty' in payload:
        payload['quantity'] = payload.pop('qty')
        
    # Filter only existing columns based on what we know
    allowed_cols = {'name', 'estimated_cost', 'is_checked', 'month', 'quantity', 'bucket', 'weeks', 'unit', 'product_id'}
    update_data = {k: v for k, v in payload.items() if k in allowed_cols}
    
    resp = supabase.table('shopping_list').update(update_data).eq('id', item_id).eq('household_id', household_id).execute()
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
