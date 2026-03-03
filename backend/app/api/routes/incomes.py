from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.core.supabase import get_supabase
from app.core.auth import get_current_user
from datetime import datetime
from typing import Optional

router = APIRouter()
_CACHE = {}
_CACHE_TTL_SECONDS = 60

@router.get("/incomes")
def list_incomes(
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    try:
        household_id = user["household_id"]
        now = datetime.utcnow()
        cached = _CACHE.get(household_id)
        if cached and cached.get("ts") and cached.get("data"):
            if (now - cached["ts"]).total_seconds() < _CACHE_TTL_SECONDS:
                return cached["data"]
                
        response = supabase.table("incomes").select("*").eq("household_id", household_id).execute()
        results = response.data

        _CACHE[household_id] = {"ts": now, "data": results}
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/incomes")
def create_income(
    payload: dict,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    try:
        household_id = user["household_id"]
        name = (payload.get("name") or "").strip()
        amount = payload.get("amount", 0)
        frequency = payload.get("frequency", "monthly")
        next_date: Optional[str] = payload.get("next_date")
        is_variable = bool(payload.get("is_variable", False))
        month: Optional[str] = payload.get("month")
        min_amount = payload.get("min_amount")
        if is_variable and min_amount is None:
            min_amount = amount

        if not name:
            raise HTTPException(status_code=400, detail="name is required")

        if is_variable and month:
            frequency = "one_time"
            if len(month) == 7: # YYYY-MM
                next_date = f"{month}-01"

        income_data = {
            "household_id": household_id,
            "name": name,
            "amount": float(amount),
            "frequency": frequency,
            "next_date": next_date,
            "is_variable": is_variable,
            "month": month,
            "min_amount": float(min_amount) if min_amount is not None else None,
        }

        response = supabase.table("incomes").insert(income_data).execute()

        _CACHE.pop(household_id, None)
        return {"id": response.data[0]["id"], "success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/incomes/{income_id}")
def update_income(
    income_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    try:
        household_id = user["household_id"]
        # Basic check
        existing = supabase.table("incomes").select("id").eq("id", income_id).eq("household_id", household_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Income not found")

        updates = {}
        if "name" in payload:
            updates["name"] = (payload.get("name") or "").strip()
        if "amount" in payload:
            updates["amount"] = float(payload.get("amount", 0))
        if "frequency" in payload:
            updates["frequency"] = payload.get("frequency") or "monthly"
        if "next_date" in payload:
            updates["next_date"] = payload.get("next_date")
        if "is_variable" in payload:
            updates["is_variable"] = bool(payload.get("is_variable"))
        if "month" in payload:
            updates["month"] = payload.get("month")
        if "min_amount" in payload:
            updates["min_amount"] = float(payload.get("min_amount")) if payload.get("min_amount") is not None else None

        if updates.get("is_variable") and updates.get("month"):
            updates["frequency"] = "one_time"
            if len(updates["month"]) == 7:
                updates["next_date"] = f"{updates['month']}-01"

        supabase.table("incomes").update(updates).eq("id", income_id).execute()
        
        _CACHE.pop(household_id, None)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/incomes/{income_id}")
def delete_income(
    income_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    try:
        household_id = user["household_id"]
        # Basic check
        existing = supabase.table("incomes").select("id").eq("id", income_id).eq("household_id", household_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Income not found")

        supabase.table("incomes").delete().eq("id", income_id).execute()
        _CACHE.pop(household_id, None)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
