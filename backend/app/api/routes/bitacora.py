from fastapi import APIRouter, Depends, HTTPException, Query
from google.cloud.firestore import Client
from app.core.firebase import get_firestore
from app.core.auth import get_current_user
from app.services.dashboard_service import DashboardService
from datetime import datetime

router = APIRouter()


def _to_iso(value) -> str:
    if value is None:
        return ""
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            pass
    return str(value)


def _build_update_payload(payload: dict) -> dict:
    updates = {}
    if not payload:
        updates["updated_at"] = datetime.now()
        return updates

    if "text" in payload:
        updates["text"] = (payload.get("text") or "").strip()
    if "kind" in payload:
        updates["kind"] = (payload.get("kind") or "nota").strip()
    if "answer" in payload:
        updates["answer"] = payload.get("answer")
    if "meta" in payload:
        updates["meta"] = payload.get("meta")
    if "status" in payload:
        updates["status"] = payload.get("status") or "active"
    if "title" in payload:
        updates["title"] = payload.get("title")
    if "summary" in payload:
        updates["summary"] = payload.get("summary")
    if "detail" in payload:
        updates["detail"] = payload.get("detail")
    if "impact" in payload:
        updates["impact"] = payload.get("impact")

    updates["updated_at"] = datetime.now()
    return updates


def _apply_bitacora_updates(entry_id: str, payload: dict, user: dict, db: Client) -> dict:
    household_id = user["household_id"]
    doc_ref = db.collection("households").document(household_id)\
        .collection("bitacora").document(entry_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Bitacora entry not found")

    updates = _build_update_payload(payload or {})
    doc_ref.set(updates, merge=True)
    return {"success": True}


def _build_observation_candidates(summary: dict) -> list[dict]:
    if not summary:
        return []
    candidates = []
    spending = summary.get("spending_zone", {})
    status = spending.get("status")
    if status in ("yellow", "red"):
        candidates.append({
            "source_id": "auto:spending_zone",
            "title": "Ritmo de gasto por encima de lo habitual",
            "summary": spending.get("label") or "El gasto viene más alto de lo usual.",
            "impact": "high" if status == "red" else "medium",
            "evidence": f"Zona de gasto: {spending.get('label') or status}."
        })

    month_overview = summary.get("month_overview", {})
    projected_balance = float(month_overview.get("projected_balance", 0) or 0)
    if projected_balance < 0:
        candidates.append({
            "source_id": "auto:projected_balance",
            "title": "Mes proyectado en riesgo",
            "summary": "Si el ritmo actual continúa, el mes cerraría ajustado.",
            "impact": "high",
            "evidence": f"Saldo proyectado: {projected_balance}."
        })

    dist = summary.get("distribution_real", {})
    blindaje = float(dist.get("blindaje", 0) or 0)
    oxigeno = float(dist.get("oxigeno", 0) or 0)
    if blindaje <= 5 and (oxigeno > 0 or summary.get("month_overview")):
        candidates.append({
            "source_id": "auto:low_blindaje",
            "title": "Blindaje bajo en la distribución",
            "summary": "Este mes el margen de blindaje está bajo lo esperado.",
            "impact": "medium",
            "evidence": f"Blindaje: {blindaje}%."
        })
    if oxigeno >= 60:
        candidates.append({
            "source_id": "auto:high_oxigeno",
            "title": "Oxígeno sobre nivel habitual",
            "summary": "Los gastos esenciales están ocupando una porción alta del ingreso.",
            "impact": "medium",
            "evidence": f"Oxígeno: {oxigeno}%."
        })

    events_mandatory = float(month_overview.get("events_mandatory_total", 0) or 0)
    events_optional = float(month_overview.get("events_optional_total", 0) or 0)
    if events_mandatory > 0 and events_optional > 0:
        candidates.append({
            "source_id": "auto:events_cluster",
            "title": "Mes con eventos acumulados",
            "summary": "Hay más de un evento en el mes que puede tensionar el flujo.",
            "impact": "medium",
            "evidence": f"Eventos obligatorios: {events_mandatory}. Opcionales: {events_optional}."
        })

    # Limit to top 3 observations
    return candidates[:3]


def _build_pattern_candidates(summary: dict) -> list[dict]:
    if not summary:
        return []
    candidates = []
    spending = summary.get("spending_zone", {})
    status = spending.get("status")
    if status in ("yellow", "red"):
        candidates.append({
            "source_id": "auto:pattern:spending_zone",
            "title": "Tendencia de gasto por encima del promedio",
            "summary": "La zona de gasto se mantiene alta en el periodo reciente.",
            "impact": "medium",
            "evidence": f"Zona de gasto: {spending.get('label') or status}."
        })

    month_overview = summary.get("month_overview", {})
    events_mandatory = float(month_overview.get("events_mandatory_total", 0) or 0)
    events_optional = float(month_overview.get("events_optional_total", 0) or 0)
    if events_mandatory > 0 and events_optional > 0:
        candidates.append({
            "source_id": "auto:pattern:events_cluster",
            "title": "Eventos acumulados tensionan el mes",
            "summary": "Cuando coinciden varios eventos, el flujo queda más ajustado.",
            "impact": "medium",
            "evidence": f"Eventos obligatorios: {events_mandatory}. Opcionales: {events_optional}."
        })

    dist = summary.get("distribution_real", {})
    blindaje = float(dist.get("blindaje", 0) or 0)
    if blindaje <= 5:
        candidates.append({
            "source_id": "auto:pattern:low_blindaje",
            "title": "Blindaje bajo de forma recurrente",
            "summary": "El margen de blindaje viene bajo en la distribución reciente.",
            "impact": "low",
            "evidence": f"Blindaje: {blindaje}%."
        })

    return candidates[:3]


@router.get("/bitacora")
def list_bitacora(
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore),
    limit: int = Query(100, ge=1, le=200)
):
    try:
        household_id = user["household_id"]
        entries_ref = db.collection("households").document(household_id).collection("bitacora")
        docs = entries_ref.order_by("created_at", direction="DESCENDING").limit(limit).stream()

        entries = []
        for doc in docs:
            data = doc.to_dict()
            entries.append({
                "id": doc.id,
                "text": data.get("text"),
                "kind": data.get("kind", "nota"),
                "answer": data.get("answer"),
                "meta": data.get("meta"),
                "source_id": data.get("source_id"),
                "created_at": _to_iso(data.get("created_at")),
                "updated_at": _to_iso(data.get("updated_at")),
                "status": data.get("status", "active"),
                "created_by": data.get("created_by"),
                "title": data.get("title"),
                "summary": data.get("summary"),
                "detail": data.get("detail"),
                "impact": data.get("impact")
            })
        return entries
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bitacora")
def create_bitacora(
    payload: dict,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        text = (payload.get("text") or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="text is required")

        kind = (payload.get("kind") or "nota").strip()
        now = datetime.now()
        data = {
            "text": text,
            "kind": kind,
            "status": payload.get("status") or "active",
            "created_at": now,
            "updated_at": now,
            "created_by": user.get("user_id")
        }
        if payload.get("answer") is not None:
            data["answer"] = payload.get("answer")
        if payload.get("meta") is not None:
            data["meta"] = payload.get("meta")
        if payload.get("source_id") is not None:
            data["source_id"] = payload.get("source_id")
        if payload.get("title") is not None:
            data["title"] = payload.get("title")
        if payload.get("summary") is not None:
            data["summary"] = payload.get("summary")
        if payload.get("detail") is not None:
            data["detail"] = payload.get("detail")
        if payload.get("impact") is not None:
            data["impact"] = payload.get("impact")
        _, ref = db.collection("households").document(household_id).collection("bitacora").add(data)
        return {"id": ref.id, "success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bitacora/auto-observations")
def auto_observations(
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        summary = None
        try:
            summary = DashboardService(db).get_dashboard_summary(household_id)
        except Exception:
            summary = None

        candidates = _build_observation_candidates(summary)
        if not candidates:
            return {"created": 0, "items": []}

        existing = db.collection("households").document(household_id)\
            .collection("bitacora").limit(200).stream()
        existing_source_ids = set()
        for doc in existing:
            data = doc.to_dict()
            source_id = data.get("source_id")
            if source_id:
                existing_source_ids.add(source_id)

        context_text = ""
        advisor = None

        created_items = []
        now = datetime.now()
        for cand in candidates:
            if cand["source_id"] in existing_source_ids:
                continue
            summary_text = cand.get("summary") or cand.get("title")
            detail_text = cand.get("evidence") or ""
            if advisor:
                try:
                    summary_text = advisor.generate_observation(
                        cand["title"], cand["impact"], context_text, cand.get("evidence")
                    )
                except Exception:
                    summary_text = cand.get("summary") or cand.get("title")

            data = {
                "text": cand["title"],
                "title": cand["title"],
                "summary": summary_text,
                "detail": detail_text,
                "impact": cand["impact"],
                "kind": "observation",
                "status": "active",
                "created_at": now,
                "updated_at": now,
                "created_by": user.get("user_id"),
                "meta": {"source": "auto", "evidence": cand.get("evidence")},
                "source_id": cand["source_id"]
            }
            _, ref = db.collection("households").document(household_id)\
                .collection("bitacora").add(data)
            created_items.append({"id": ref.id, "title": cand["title"]})

        return {"created": len(created_items), "items": created_items}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bitacora/auto-patterns")
def auto_patterns(
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        summary = None
        try:
            summary = DashboardService(db).get_dashboard_summary(household_id)
        except Exception:
            summary = None

        candidates = _build_pattern_candidates(summary)
        if not candidates:
            return {"created": 0, "items": []}

        existing = db.collection("households").document(household_id)\
            .collection("bitacora").limit(200).stream()
        existing_source_ids = set()
        for doc in existing:
            data = doc.to_dict()
            source_id = data.get("source_id")
            if source_id:
                existing_source_ids.add(source_id)

        context_text = ""
        advisor = None

        created_items = []
        now = datetime.now()
        for cand in candidates:
            if cand["source_id"] in existing_source_ids:
                continue
            summary_text = cand.get("summary") or cand.get("title")
            detail_text = cand.get("evidence") or ""
            if advisor:
                try:
                    summary_text = advisor.generate_pattern(
                        cand["title"], context_text, cand.get("evidence")
                    )
                except Exception:
                    summary_text = cand.get("summary") or cand.get("title")

            data = {
                "text": cand["title"],
                "title": cand["title"],
                "summary": summary_text,
                "detail": detail_text,
                "impact": cand["impact"],
                "kind": "pattern",
                "status": "active",
                "created_at": now,
                "updated_at": now,
                "created_by": user.get("user_id"),
                "meta": {"source": "auto", "evidence": cand.get("evidence")},
                "source_id": cand["source_id"]
            }
            _, ref = db.collection("households").document(household_id)\
                .collection("bitacora").add(data)
            created_items.append({"id": ref.id, "title": cand["title"]})

        return {"created": len(created_items), "items": created_items}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bitacora/ask")
def ask_bitacora(
    payload: dict,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        question = (payload.get("question") or payload.get("text") or "").strip()
        if not question:
            raise HTTPException(status_code=400, detail="question is required")

        extra_context = payload.get("context") or ""
        summary = None
        try:
            summary = DashboardService(db).get_dashboard_summary(user["household_id"])
        except Exception:
            summary = None

        context_text = ""
        answer = "🤖 La Bitácora Inteligente se está actualizando para conectarse a Supabase. Podrás volver a charlar pronto."
        return {"answer": answer, "context": context_text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bitacora/simulate")
def simulate_bitacora(
    payload: dict,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        title = (payload.get("title") or payload.get("text") or "").strip()
        if not title:
            raise HTTPException(status_code=400, detail="title is required")

        meta = payload.get("meta") or {}
        category = payload.get("category") or meta.get("category")
        cost = payload.get("estimated_cost") or meta.get("estimated_cost")
        horizon_months = payload.get("horizon_months") or meta.get("horizon_months")
        tco_total = payload.get("tco_total") or meta.get("tco_total")
        extra_context = payload.get("context") or ""

        summary = None
        try:
            summary = DashboardService(db).get_dashboard_summary(user["household_id"])
        except Exception:
            summary = None
        context_text = ""

        # Mock simulation for now
        simulation = {
            "title": title,
            "feasibility": "neutral",
            "impact": "moderate",
            "monthly_impact": 0,
            "blindaje_after": 0,
            "oxigeno_after": 0,
            "advice": "Simulador temporalmente en mantenimiento Supabase."
        }

        monthly_target = None
        if cost and horizon_months:
            try:
                monthly_target = round(float(cost) / float(horizon_months))
            except Exception:
                monthly_target = None

        return {
            "simulation": simulation,
            "monthly_target": monthly_target,
            "context": context_text
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bitacora/{entry_id}")
def get_bitacora_entry(
    entry_id: str,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        household_id = user["household_id"]
        doc_ref = db.collection("households").document(household_id)\
            .collection("bitacora").document(entry_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Bitacora entry not found")
        data = doc.to_dict()
        return {
            "id": doc.id,
            "text": data.get("text"),
            "kind": data.get("kind", "nota"),
            "answer": data.get("answer"),
            "meta": data.get("meta"),
            "source_id": data.get("source_id"),
            "created_at": _to_iso(data.get("created_at")),
            "updated_at": _to_iso(data.get("updated_at")),
            "status": data.get("status", "active"),
            "created_by": data.get("created_by"),
            "title": data.get("title"),
            "summary": data.get("summary"),
            "detail": data.get("detail"),
            "impact": data.get("impact")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/bitacora/{entry_id}")
@router.post("/bitacora/{entry_id}")
def update_bitacora(
    entry_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        return _apply_bitacora_updates(entry_id, payload, user, db)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bitacora/{entry_id}/update")
def update_bitacora_action(
    entry_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
    db: Client = Depends(get_firestore)
):
    try:
        return _apply_bitacora_updates(entry_id, payload, user, db)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


