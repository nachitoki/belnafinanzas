from fastapi import APIRouter, Depends, HTTPException
from app.core.firebase import get_firestore
from app.core.supabase import get_supabase
from app.core.auth import get_current_user
from app.services.dashboard_service import DashboardService
from google.cloud.firestore import Client as FirestoreClient
from supabase import Client as SupabaseClient

router = APIRouter()

@router.get("/summary")
def get_dashboard_summary(
    user: dict = Depends(get_current_user),
    db: FirestoreClient = Depends(get_firestore),
    supabase: SupabaseClient = Depends(get_supabase)
):
    """
    Get the Dashboard Summary:
    - Household Status (Green/Yellow/Red)
    - Spending Zone
    - Upcoming Items
    """
    try:
        service = DashboardService(db, supabase)
        return service.get_dashboard_summary(user['household_id'])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/settings")
def update_dashboard_settings(
    settings: dict,
    user: dict = Depends(get_current_user),
    db: FirestoreClient = Depends(get_firestore),
    supabase: SupabaseClient = Depends(get_supabase)
):
    """
    Update Household Settings (e.g. food_budget)
    """
    try:
        service = DashboardService(db, supabase)
        service.update_settings(user['household_id'], settings)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
