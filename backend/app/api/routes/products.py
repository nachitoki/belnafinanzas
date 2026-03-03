from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client
from app.core.supabase import get_supabase

router = APIRouter()

@router.get("/strategic")
def get_strategic_products(
    category: Optional[str] = Query(None, description="Filter by category (esenciales, despensa, limpieza)"),
    household_id: str = "3YrfW0araoI8So0SNepX",
    supabase: Client = Depends(get_supabase)
):
    """Get list of strategic products with their calculated status"""
    try:
        query = supabase.table("products").select("*").eq("household_id", household_id)
        if category:
            query = query.eq("category_tag", category)
        resp = query.limit(200).execute()
        return resp.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{product_id}/insight")
def get_product_insight(
    product_id: str,
    household_id: str = "3YrfW0araoI8So0SNepX",
    supabase: Client = Depends(get_supabase)
):
    """Get detailed price insight for a product"""
    try:
        product = supabase.table("products").select("*").eq("id", product_id).execute()
        prices = supabase.table("product_prices").select("*").eq("product_id", product_id).order("date", desc=True).limit(20).execute()
        return {
            "product": product.data[0] if product.data else None,
            "prices": prices.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
