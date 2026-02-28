from fastapi import APIRouter, Depends, HTTPException
from google.cloud.firestore import Client
from app.core.firebase import get_firestore
from app.core.auth import get_current_user
from datetime import datetime, timedelta, date
from typing import Any

router = APIRouter()
_CACHE = {}
_CACHE_TTL_SECONDS = 30


def _parse_date(value) -> date | None:
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


def _months_between(start: date, end: date) -> int:
    if end < start:
        return 0
    return max(1, (end.year - start.year) * 12 + (end.month - start.month) + 1)


@router.get("/horizon")
def get_horizon(
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        now_ts = datetime.utcnow()
        cached = _CACHE.get(household_id)
        if cached and cached.get("ts") and cached.get("data"):
            if (now_ts - cached["ts"]).total_seconds() < _CACHE_TTL_SECONDS:
                return cached["data"]
        now = datetime.utcnow().date()
        horizon = now + timedelta(days=60)
        budget_ref = 2000000  # referencia suave para alertas

        items: list[dict[str, Any]] = []

        # Commitments (next_date)
        commitments_docs = db.collection("households").document(household_id)\
            .collection("commitments").limit(200).stream()
        for doc in commitments_docs:
            data = doc.to_dict()
            next_date = _parse_date(data.get("next_date"))
            
            # Check if paid this month
            last_paid = _parse_date(data.get("last_paid_at"))
            is_paid_this_month = last_paid and last_paid.month == now.month and last_paid.year == now.year
            
            if is_paid_this_month:
                continue
                
            # Include if next_date is in the past (overdue) OR within the 60-day horizon
            if next_date and next_date <= horizon:
                severity = "high"
                if next_date < now:
                    severity = "critical"
                items.append({
                    "type": "commitment",
                    "label": data.get("name"),
                    "date": next_date.isoformat(),
                    "amount": data.get("amount", 0),
                    "severity": severity,
                    "is_overdue": next_date < now,
                    "flow_category": data.get("flow_category"),
                    "impact_pct": round((float(data.get("amount", 0) or 0) / budget_ref) * 100, 1) if budget_ref else 0
                })

        # Events (date)
        events_docs = db.collection("households").document(household_id)\
            .collection("events").limit(200).stream()
        for doc in events_docs:
            data = doc.to_dict()
            event_date = _parse_date(data.get("date"))
            if not event_date or not (now <= event_date <= horizon):
                continue

            amount_estimate = float(data.get("amount_estimate", 0) or 0)
            flow_category = data.get("flow_category")
            provisioned = flow_category == "provision"
            months_left = _months_between(now, event_date) if provisioned else 0
            monthly_amount = round(amount_estimate / months_left, 2) if provisioned and months_left else amount_estimate

            items.append({
                "type": "event",
                "label": data.get("name"),
                "date": event_date.isoformat(),
                "amount": monthly_amount,
                "original_amount": amount_estimate,
                "provisioned": provisioned,
                "months_remaining": months_left if provisioned else None,
                "severity": "high" if data.get("is_mandatory", False) else "medium",
                "flow_category": flow_category,
                "impact_pct": round((monthly_amount / budget_ref) * 100, 1) if budget_ref else 0
            })

        # Sort by date
        items.sort(key=lambda x: x.get("date", ""))

        result = items[:20]
        _CACHE[household_id] = {"ts": now_ts, "data": result}
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
