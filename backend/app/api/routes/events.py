from fastapi import APIRouter, Depends, HTTPException
from google.cloud.firestore import Client
from app.core.firebase import get_firestore
from app.core.auth import get_current_user
from datetime import datetime, timedelta, date
from typing import Optional

router = APIRouter()
_CACHE = {}
_CACHE_TTL_SECONDS = 60


@router.get("/events")
def list_events(
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
            .collection("events")\
            .limit(200)\
            .stream()

        results = []
        for doc in docs:
            data = doc.to_dict()
            results.append({
                "id": doc.id,
                "name": data.get("name"),
                "amount_estimate": data.get("amount_estimate"),
                "event_type": data.get("event_type", "annual"),
                "date": data.get("date"),
                "is_mandatory": data.get("is_mandatory", False),
                "flow_category": data.get("flow_category"),
                "created_at": data.get("created_at").isoformat() if hasattr(data.get("created_at"), "isoformat") else (data.get("created_at") or "")
            })
        _CACHE[household_id] = {"ts": now, "data": results}
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/events")
def create_event(
    payload: dict,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        name = (payload.get("name") or "").strip()
        amount_estimate = payload.get("amount_estimate", 0)
        event_type = payload.get("event_type", "annual")
        date_value: Optional[str] = payload.get("date")
        is_mandatory = bool(payload.get("is_mandatory", False))
        flow_category = payload.get("flow_category") or "provision"

        if not name:
            raise HTTPException(status_code=400, detail="name is required")
        if not date_value:
            raise HTTPException(status_code=400, detail="date is required")

        event_data = {
            "name": name,
            "amount_estimate": float(amount_estimate),
            "event_type": event_type,
            "date": date_value,
            "is_mandatory": is_mandatory,
            "flow_category": flow_category,
            "created_at": datetime.now()
        }

        _, ref = db.collection("households").document(household_id)\
            .collection("events").add(event_data)

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


@router.patch("/events/{event_id}")
def update_event(
    event_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        ref = db.collection("households").document(household_id)\
            .collection("events").document(event_id)
        doc = ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="event not found")

        data = doc.to_dict() or {}
        updates = {}

        action = payload.get("action")
        if action == "postpone":
            postpone_value = payload.get("postpone_days")
            current_date = _parse_date(data.get("date")) or datetime.now().date()
            if isinstance(postpone_value, str) and postpone_value == "next_month":
                updates["date"] = _add_months(current_date, 1).isoformat()
            else:
                try:
                    days = int(postpone_value)
                except Exception:
                    days = 0
                if days > 0:
                    updates["date"] = (current_date + timedelta(days=days)).isoformat()

        # Direct field updates (optional)
        for key in ["name", "amount_estimate", "event_type", "date", "is_mandatory", "flow_category"]:
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
