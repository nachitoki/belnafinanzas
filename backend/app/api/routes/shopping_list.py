from fastapi import APIRouter, Depends, HTTPException, Query
from google.cloud.firestore import Client
from app.core.firebase import get_firestore
from app.core.auth import get_current_user
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

router = APIRouter()

class ShoppingItem(BaseModel):
    id: Optional[str]
    name: str
    estimated_cost: int
    is_checked: bool = False
    month: str # YYYY-MM

@router.get("/shopping-list")
def get_shopping_list(
    month: str,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    """Get extra shopping items for a specific month"""
    household_id = user['household_id']
    
    docs = db.collection('households').document(household_id)\
        .collection('shopping_list')\
        .where('month', '==', month)\
        .stream()
        
    return [
        {**d.to_dict(), "id": d.id} 
        for d in docs
    ]

@router.post("/shopping-list")
def add_shopping_item(
    item: ShoppingItem,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    """Add a new item to the shopping list"""
    household_id = user['household_id']
    
    item_data = item.dict(exclude={'id'})
    
    # If ID provided, update? No, let's treat POST as create for simplicity or UPSERT if ID exists?
    # Let's do simple create.
    
    new_ref = db.collection('households').document(household_id)\
        .collection('shopping_list').document()
        
    new_ref.set(item_data)
    
    return {**item_data, "id": new_ref.id}

@router.delete("/shopping-list/{item_id}")
def delete_shopping_item(
    item_id: str,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    household_id = user['household_id']
    db.collection('households').document(household_id)\
        .collection('shopping_list').document(item_id).delete()
        
    return {"success": True}
