from fastapi import APIRouter, Depends, HTTPException
from google.cloud.firestore import Client
from app.core.firebase import get_firestore
from app.core.auth import get_current_user
from datetime import datetime, timedelta, date
from typing import Any

router = APIRouter()


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


def _pct(amount: float, base: float) -> float:
    if base <= 0:
        return 0.0
    try:
        return (amount / base) * 100.0
    except Exception:
        return 0.0


@router.get("/alerts")
def get_alerts(
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        now = datetime.utcnow().date()
        horizon_7 = now + timedelta(days=7)
        horizon_14 = now + timedelta(days=14)
        horizon_3 = now + timedelta(days=3)

        alerts: list[dict[str, Any]] = []

        # Budget base for thresholds
        budget_base = 0
        try:
            from app.services.dashboard_service import DashboardService
            summary = DashboardService(db).get_dashboard_summary(household_id)
            mo = summary.get("month_overview", {})
            budget_base = mo.get("income_total", 0) or 0
        except Exception:
            budget_base = 0
        if budget_base <= 0:
            budget_base = 2_000_000
        if budget_base < 1_500_000:
            budget_base = 1_500_000
        threshold_amount = budget_base * 0.03

        # Load commitments
        commitments_docs = db.collection("households").document(household_id)\
            .collection("commitments").limit(200).stream()
        for doc in commitments_docs:
            data = doc.to_dict()
            next_date = _parse_date(data.get("next_date"))
            amount = float(data.get("amount", 0) or 0)
            if next_date and now <= next_date <= horizon_7:
                if amount < threshold_amount and next_date > horizon_3:
                    continue
                alerts.append({
                    "type": "commitment",
                    "severity": "high",
                    "title": "Compromiso proximo",
                    "message": f"{data.get('name')} vence pronto",
                    "date": next_date.isoformat(),
                    "impact_pct": _pct(amount, budget_base)
                })

        # Load events
        events_docs = db.collection("households").document(household_id)\
            .collection("events").limit(200).stream()
        for doc in events_docs:
            data = doc.to_dict()
            event_date = _parse_date(data.get("date"))
            amount = float(data.get("amount_estimate", 0) or 0)
            mandatory = bool(data.get("is_mandatory", False))
            if event_date and now <= event_date <= (horizon_14 if mandatory else horizon_7):
                if amount < threshold_amount and event_date > horizon_3:
                    continue
                alerts.append({
                    "type": "event",
                    "severity": "medium" if not mandatory else "high",
                    "title": "Evento cercano",
                    "message": f"{data.get('name')} se acerca",
                    "date": event_date.isoformat(),
                    "impact_pct": _pct(amount, budget_base)
                })

        # Simple budget alert from dashboard month overview
        try:
            from app.services.dashboard_service import DashboardService
            summary = DashboardService(db).get_dashboard_summary(household_id)
            mo = summary.get("month_overview", {})
            projected = mo.get("projected_balance", 0) or 0
            optional_budget = mo.get("optional_budget", 0) or 0
            income_total = mo.get("income_total", 0) or 0
            if projected < 0:
                alerts.append({
                    "type": "budget",
                    "severity": "high",
                    "title": "Saldo proyectado negativo",
                    "message": f"Deficit estimado: ${abs(projected):,.0f}",
                    "date": None
                })
            elif income_total > 0 and optional_budget < income_total * 0.1:
                alerts.append({
                    "type": "budget",
                    "severity": "low",
                    "title": "Bajo margen para opcionales",
                    "message": f"Disponible opcional menor al 10% del ingreso",
                    "date": None
                })
        except Exception:
            pass

        # Sort by severity
        severity_rank = {"high": 0, "medium": 1, "low": 2}
        alerts.sort(key=lambda a: severity_rank.get(a.get("severity", "low"), 2))

        return alerts[:10]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
