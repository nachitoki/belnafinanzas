from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from app.core.supabase import get_supabase
from app.core.auth import get_current_user
from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()

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
    supabase: Client = Depends(get_supabase)
):
    """Get meal plan for a date range."""
    try:
        household_id = user["household_id"]
        
        resp = supabase.table("meal_plans").select("*")\
            .eq("household_id", household_id)\
            .gte("date", start_date)\
            .lte("date", end_date)\
            .execute()
            
        return resp.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/meals")
def save_meal_plan(
    meals: List[MealPlanPayload],
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    """Save (Upsert) meal plan entries."""
    try:
        household_id = user["household_id"]
        
        for meal in meals:
            data = meal.dict()
            data["household_id"] = household_id
            data["updated_at"] = datetime.utcnow().isoformat()
            
            # Use delete + insert instead of upsert to avoid constraint name mismatch (42P10)
            supabase.table("meal_plans").delete()\
                .eq("household_id", household_id)\
                .eq("date", data["date"])\
                .eq("type", data["type"])\
                .execute()
                
            supabase.table("meal_plans").insert(data).execute()
            
        return {"success": True, "count": len(meals)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
