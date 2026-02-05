from fastapi import APIRouter, Depends, HTTPException
from google.cloud.firestore import Client
from app.core.firebase import get_firestore
from app.core.auth import get_current_user
from datetime import datetime, timedelta, date
from typing import Optional

router = APIRouter()
_CACHE = {}
_CACHE_TTL_SECONDS = 60


@router.get("/commitments")
def list_commitments(
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
            .collection("commitments")\
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
                "flow_category": data.get("flow_category"),
                "next_date": data.get("next_date"),
                "installments_total": data.get("installments_total", 0),
                "installments_paid": data.get("installments_paid", 0),
                "created_at": data.get("created_at").isoformat() if data.get("created_at") else ""
            })
        _CACHE[household_id] = {"ts": now, "data": results}
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/commitments")
def create_commitment(
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
        flow_category = payload.get("flow_category") or "structural"
        installments_total = int(payload.get("installments_total", 0))
        installments_paid = int(payload.get("installments_paid", 0))

        if not name:
            raise HTTPException(status_code=400, detail="name is required")

        commitment_data = {
            "name": name,
            "amount": float(amount),
            "frequency": frequency,
            "flow_category": flow_category,
            "next_date": next_date,
            "installments_total": installments_total,
            "installments_paid": installments_paid,
            "created_at": datetime.now()
        }

        _, ref = db.collection("households").document(household_id)\
            .collection("commitments").add(commitment_data)

        _CACHE.pop(household_id, None)
        return {"id": ref.id, "success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _parse_date(value) -> Optional[date]:
    if not value:
        return None
    if hasattr(value, "date"):
        try:
            return value.date()
        except Exception:
            pass
    try:
        return datetime.fromisoformat(str(value)).date()
    except Exception:
        return None


def _add_months(source: date, months: int) -> date:
    month = source.month - 1 + months
    year = source.year + month // 12
    month = month % 12 + 1
    day = min(source.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    return date(year, month, day)


@router.patch("/commitments/{commitment_id}")
def update_commitment(
    commitment_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        ref = db.collection("households").document(household_id)\
            .collection("commitments").document(commitment_id)
        doc = ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="commitment not found")

        data = doc.to_dict() or {}
        updates = {}

        action = payload.get("action")
        if action == "pay":
            updates["last_paid_at"] = datetime.now().isoformat()
            installments_total = int(data.get("installments_total") or 0)
            installments_paid = int(data.get("installments_paid") or 0)
            if installments_total > 0 and installments_paid < installments_total:
                updates["installments_paid"] = installments_paid + 1

            # Create Transaction Record
            try:
                # 1. Get default account
                accounts = db.collection("households").document(household_id).collection("accounts")\
                    .where("is_active", "==", True).limit(1).stream()
                account_id = next((a.id for a in accounts), None)
                
                if account_id:
                    # 2. Get default category (Housing or Utilities for structural, or generic expense)
                    # For simplicity, we search for a generic 'Gastos' or 'Compromisos' or first expense cat
                    categories_ref = db.collection("households").document(household_id).collection("categories")
                    cat_query = categories_ref.where("kind", "==", "expense").limit(1).stream()
                    category_id = next((c.id for c in cat_query), "default_expense")

                    # 3. Create Transaction
                    amount = float(data.get("amount") or 0)
                    transaction_data = {
                        "occurred_on": datetime.now(),
                        "amount": -abs(amount), # Expense is negative
                        "description": f"Pago: {data.get('name')}",
                        "category_id": category_id,
                        "account_id": account_id,
                        "status": "posted",
                        "source": "commitment",
                        "source_id": commitment_id,
                        "created_at": datetime.now()
                    }
                    db.collection("households").document(household_id).collection("transactions").add(transaction_data)
            except Exception as e:
                print(f"Error creating transaction for commitment: {e}")
                # Don't fail the update if transaction creation fails, but log it

            frequency = data.get("frequency", "monthly")
            next_date = _parse_date(data.get("next_date")) or datetime.now().date()
            if frequency == "weekly":
                updates["next_date"] = (next_date + timedelta(days=7)).isoformat()
            elif frequency == "biweekly":
                updates["next_date"] = (next_date + timedelta(days=14)).isoformat()
            elif frequency == "yearly":
                updates["next_date"] = _add_months(next_date, 12).isoformat()
            elif frequency == "one_time":
                updates["next_date"] = None
            else:
                updates["next_date"] = _add_months(next_date, 1).isoformat()

        elif action == "postpone":
            postpone_value = payload.get("postpone_days")
            current_date = _parse_date(data.get("next_date")) or datetime.now().date()
            if isinstance(postpone_value, str) and postpone_value == "next_month":
                updates["next_date"] = _add_months(current_date, 1).isoformat()
            else:
                try:
                    days = int(postpone_value)
                except Exception:
                    days = 0
                if days > 0:
                    updates["next_date"] = (current_date + timedelta(days=days)).isoformat()

        # Direct field updates (optional)
        for key in ["name", "amount", "frequency", "next_date", "flow_category", "installments_total", "installments_paid"]:
            if key in payload and payload[key] is not None:
                updates[key] = payload[key]

        if not updates:
            return {"success": True, "updated": False}

        ref.update(updates)
        _CACHE.pop(household_id, None)
        return {"success": True, "updated": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/commitments/{commitment_id}")
def delete_commitment(
    commitment_id: str,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        ref = db.collection("households").document(household_id)\
            .collection("commitments").document(commitment_id)
        
        ref.delete()
        _CACHE.pop(household_id, None)
        return {"success": True, "deleted": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
