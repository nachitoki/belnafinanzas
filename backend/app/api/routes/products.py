from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.firebase import get_firestore
from app.services.product_service import ProductService
from google.cloud.firestore import Client

router = APIRouter()

@router.get("/strategic")
def get_strategic_products(
    category: Optional[str] = Query(None, description="Filter by category (esenciales, despensa, limpieza)"),
    household_id: str = "3YrfW0araoI8So0SNepX",
    db: Client = Depends(get_firestore)
):
    """
    Get list of strategic products with their calculated status
    """
    try:
        service = ProductService(db)
        return service.get_strategic_products(household_id, category)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{product_id}/insight")
def get_product_insight(
    product_id: str,
    household_id: str = "3YrfW0araoI8So0SNepX",
    db: Client = Depends(get_firestore)
):
    """
    Get detailed price insight for a product
    """
    try:
        service = ProductService(db)
        return service.get_product_insight(household_id, product_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
