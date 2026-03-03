from fastapi import APIRouter, Depends, HTTPException
from supabase import Client as SupabaseClient
from app.core.supabase import get_supabase
from app.core.auth import get_current_user
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class MealPlanPayload(BaseModel):
    date: str  # YYYY-MM-DD
    type: str = "lunch"
    recipe_id: Optional[str] = None
    recipe_name: Optional[str] = ""
    recipe_cost: Optional[int] = 0

@router.get("/meals")
def get_meal_plan(
    start_date: str,
    end_date: str,
    user: dict = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase)
):
    """
    Get meal plan for a date range from Supabase.
    """
    try:
        household_id = user["household_id"]
        
        # Query Supabase: date >= start_date AND date <= end_date
        response = supabase.table("meal_plans") \
            .select("*") \
            .eq("household_id", household_id) \
            .gte("date", start_date) \
            .lte("date", end_date) \
            .execute()
            
        return response.data
    except Exception as e:
        logger.error(f"Error fetching meals from Supabase: {e}")
        raise HTTPException(status_code=500, detail=f"Supabase error: {str(e)}")

@router.post("/meals")
def save_meal_plan(
    meals: List[MealPlanPayload],
    user: dict = Depends(get_current_user),
    supabase: SupabaseClient = Depends(get_supabase)
):
    """
    Save (Upsert) meal plan entries to Supabase.
    """
    try:
        household_id = user["household_id"]
        
        # Build upsert payload
        upsert_data = []
        for meal in meals:
            # We enforce saving null instead of empty string if that's preferred, 
            # but empty string is fine as long as frontend parses it.
            record = meal.model_dump() if hasattr(meal, 'model_dump') else meal.dict()
            record["household_id"] = household_id
            upsert_data.append(record)
            
        if not upsert_data:
            return {"success": True, "count": 0}

        # Perform the bulk upsert (requires UNIQUE(household_id, date, type) on Supabase table)
        response = supabase.table("meal_plans").upsert(
            upsert_data, 
            on_conflict="household_id, date, type"
        ).execute()
        
        return {"success": True, "count": len(upsert_data)}
        
    except Exception as e:
        logger.error(f"Error saving meals to Supabase: {e}")
        raise HTTPException(status_code=500, detail=f"Supabase error: {str(e)}")
