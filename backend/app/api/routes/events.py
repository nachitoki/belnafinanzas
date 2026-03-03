from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.core.supabase import get_supabase
from app.core.auth import get_current_user
from datetime import datetime, timedelta, date
from typing import Optional

router = APIRouter()
_CACHE = {}
_CACHE_TTL_SECONDS = 60

@router.get("/events")
def list_events(
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
                
        response = supabase.table("events").select("*").eq("household_id", household_id).execute()
        results = []
        for data in response.data:
            results.append({
                "id": data.get("id"),
                "name": data.get("name"),
                "amount_estimate": data.get("amount_estimate"),
                "event_type": "annual", # Not in new schema directly, just default to annual
                "date": data.get("date"),
                "is_mandatory": data.get("is_mandatory", False),
                # "flow_category": data.get("flow_category"),
                "created_at": data.get("created_at")
            })
        _CACHE[household_id] = {"ts": now, "data": results}
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/events")
def create_event(
    payload: dict,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    try:
        household_id = user["household_id"]
        name = (payload.get("name") or "").strip()
        amount_estimate = payload.get("amount_estimate", 0)
        date_value: Optional[str] = payload.get("date")
        is_mandatory = bool(payload.get("is_mandatory", False))

        if not name:
            raise HTTPException(status_code=400, detail="name is required")
        if not date_value:
            raise HTTPException(status_code=400, detail="date is required")

        event_data = {
            "household_id": household_id,
            "name": name,
            "amount_estimate": float(amount_estimate),
            "date": date_value,
            "is_mandatory": is_mandatory,
        }

        resp = supabase.table("events").insert(event_data).execute()

        _CACHE.pop(household_id, None)
        return {"id": resp.data[0]["id"], "success": True}
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
    supabase: Client = Depends(get_supabase)
):
    try:
        household_id = user["household_id"]
        
        doc_resp = supabase.table("events").select("*").eq("id", event_id).eq("household_id", household_id).execute()
        if not doc_resp.data:
            raise HTTPException(status_code=404, detail="event not found")

        data = doc_resp.data[0]
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

        for key in ["name", "amount_estimate", "date", "is_mandatory"]:
            if key in payload and payload[key] is not None:
                updates[key] = payload[key]

        if not updates:
            return {"success": True, "updated": False}

        supabase.table("events").update(updates).eq("id", event_id).execute()
        _CACHE.pop(household_id, None)
        return {"success": True, "updated": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/events/{event_id}")
def delete_event(
    event_id: str,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    try:
        household_id = user["household_id"]
        supabase.table("events").delete().eq("id", event_id).eq("household_id", household_id).execute()
        _CACHE.pop(household_id, None)
        return {"success": True, "deleted": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
