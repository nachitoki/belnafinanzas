from fastapi import APIRouter, Depends, HTTPException
from app.core.firebase import get_firestore
from app.core.auth import get_current_user
from app.services.dashboard_service import DashboardService
from google.cloud.firestore import Client

router = APIRouter()

@router.get("/summary")
def get_dashboard_summary(
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    """
    Get the Dashboard Summary:
    - Household Status (Green/Yellow/Red)
    - Spending Zone
    - Upcoming Items
    """
    try:
        service = DashboardService(db)
        return service.get_dashboard_summary(user['household_id'])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
