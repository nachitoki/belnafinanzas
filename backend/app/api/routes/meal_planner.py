from fastapi import APIRouter, Depends, HTTPException, Query
from google.cloud.firestore import Client
from app.core.firebase import get_firestore
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
    db: Client = Depends(get_firestore)
):
    """
    Get meal plan for a date range.
    """
    try:
        household_id = user["household_id"]
        
        # Parse dates
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
        
        # Convert to datetime for Firestore query (assuming occurred_on/date is stored as string or timestamp)
        # Actually, let's store 'date' as a string YYYY-MM-DD in the document ID for easy upsert, 
        # or just query by the field 'date'. 
        
        # Query
        # We store meals in a subcollection 'meal_plans'
        docs = db.collection("households").document(household_id)\
            .collection("meal_plans")\
            .where("date", ">=", start_date)\
            .where("date", "<=", end_date)\
            .stream()
            
        results = []
        for doc in docs:
            results.append(doc.to_dict())
            
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/meals")
def save_meal_plan(
    meals: List[MealPlanPayload],
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    """
    Save (Upsert) meal plan entries.
    """
    try:
        household_id = user["household_id"]
        batch = db.batch()
        collection_ref = db.collection("households").document(household_id).collection("meal_plans")
        
        for meal in meals:
            # Create a deterministic ID: YYYY-MM-DD_type
            doc_id = f"{meal.date}_{meal.type}"
            doc_ref = collection_ref.document(doc_id)
            
            data = meal.dict()
            data["updated_at"] = datetime.utcnow()
            
            batch.set(doc_ref, data, merge=True)
            
        batch.commit()
        return {"success": True, "count": len(meals)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
