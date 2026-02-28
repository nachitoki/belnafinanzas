from fastapi import APIRouter, Depends, HTTPException
from google.cloud.firestore import Client
from app.core.firebase import get_firestore
from app.core.auth import get_current_user
from datetime import datetime
from typing import Optional

router = APIRouter()
_CACHE = {}
_CACHE_TTL_SECONDS = 60


@router.get("/incomes")
def list_incomes(
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        now = datetime.utcnow()
        cached = _CACHE.get(household_id)
        if cached and cached.get("ts") and cached.get("data"):
            if (now - cached["ts"]).total_seconds() < _CACHE_TTL_SECONDS:
                return cached["data"]
        docs = db.collection("households").document(household_id)\
            .collection("incomes")\
            .limit(200)\
            .stream()

        results = []
        for doc in docs:
            data = doc.to_dict()
            results.append({
                "id": doc.id,
                "name": data.get("name"),
                "amount": data.get("amount"),
                "frequency": data.get("frequency", "monthly"),
                "is_variable": data.get("is_variable", False),
                "month": data.get("month"),
                "min_amount": data.get("min_amount"),
                "next_date": data.get("next_date"),
                "created_at": data.get("created_at").isoformat() if hasattr(data.get("created_at"), "isoformat") else (data.get("created_at") or "")
            })
        _CACHE[household_id] = {"ts": now, "data": results}
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/incomes")
def create_income(
    payload: dict,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
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
            next_date = f"{month}-01"

        income_data = {
            "name": name,
            "amount": float(amount),
            "frequency": frequency,
            "next_date": next_date,
            "is_variable": is_variable,
            "month": month,
            "min_amount": float(min_amount) if min_amount is not None else None,
            "created_at": datetime.now()
        }

        _, ref = db.collection("households").document(household_id)\
            .collection("incomes").add(income_data)

        _CACHE.pop(household_id, None)
        return {"id": ref.id, "success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/incomes/{income_id}")
def update_income(
    income_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        doc_ref = db.collection("households").document(household_id)\
            .collection("incomes").document(income_id)
        doc = doc_ref.get()
        if not doc.exists:
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
            updates["next_date"] = f"{updates['month']}-01"

        doc_ref.set(updates, merge=True)
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
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        doc_ref = db.collection("households").document(household_id)\
            .collection("incomes").document(income_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Income not found")

        doc_ref.delete()
        _CACHE.pop(household_id, None)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
