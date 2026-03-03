from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from app.core.supabase import get_supabase
from app.core.auth import get_current_user
from datetime import datetime, timedelta, date
from typing import Optional
import traceback

router = APIRouter()
_CACHE = {}
_CACHE_TTL_SECONDS = 60

@router.get("/commitments")
def list_commitments(
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
        
        print(f"DEBUG: Fetching commitments for {household_id} from Supabase")
        response = supabase.table("commitments").select("*").eq("household_id", household_id).execute()
        
        results = []
        for data in response.data:
            results.append({
                "id": data.get("id"),
                "name": data.get("name"),
                "amount": data.get("amount"),
                "frequency": data.get("frequency", "monthly"),
                "flow_category": data.get("flow_category"),
                "next_date": data.get("next_date"),
                "installments_total": data.get("installments_total", 0),
                "installments_paid": data.get("installments_paid", 0),
                "is_variable": data.get("is_variable", False),
                "last_paid_at": data.get("last_paid_at"),
                "created_at": data.get("created_at")
            })
        
        # Synthetic Commitments Logic
        try:
            start_of_month = datetime(now.year, now.month, 1).strftime("%Y-%m-%d")
            current_month_str = now.strftime("%Y-%m")
            
            # Check for REAL shopping commitments in database
            shopping_keywords = ["compra grande", "jumbo", "lider", "unimarc", "supermercado", "tottus", "santa isabel"]
            has_real_shopping = any(any(k in (c.get("name") or "").lower() for k in shopping_keywords) for c in results)

            # Meal Plans
            meal_resp = supabase.table("meal_plans").select("recipe_cost").eq("household_id", household_id).gte("date", start_of_month).execute()
            meals_total = sum((m.get("recipe_cost") or 0) for m in meal_resp.data)
                
            # Fetch Extra Shopping Items for the month
            shop_resp = supabase.table("shopping_list").select("estimated_cost").eq("household_id", household_id).eq("month", current_month_str).execute()
            extras_total = sum((s.get("estimated_cost") or 0) for s in shop_resp.data)
            
            # TOTAL = Meals + Extras
            compra_grande_total = meals_total + extras_total

            if not has_real_shopping:
                results.append({
                    "id": "synthetic_meals",
                    "name": "Almuerzos Planificados",
                    "amount": 0,
                    "frequency": "monthly",
                    "flow_category": "structural",
                    "next_date": datetime(now.year, now.month, 1).strftime("%Y-%m-%d"),
                    "installments_total": 0,
                    "installments_paid": 0,
                    "last_paid_at": None,
                    "created_at": now.isoformat(),
                    "description": f"Costo estimado de recetas: ${meals_total:,}"
                })
                
                results.append({
                    "id": "synthetic_shopping",
                    "name": "Total Compra Grande",
                    "amount": compra_grande_total,
                    "frequency": "monthly",
                    "flow_category": "structural",
                    "next_date": datetime(now.year, now.month, 1).strftime("%Y-%m-%d"),
                    "installments_total": 0,
                    "installments_paid": 0,
                    "last_paid_at": None,
                    "created_at": now.isoformat(),
                    "description": f"Almuerzos: ${meals_total:,} + Despensa: ${extras_total:,}"
                })
            else:
                results.append({
                    "id": "synthetic_meals_info",
                    "name": "Almuerzos Planificados (Info)",
                    "amount": 0,
                    "frequency": "monthly",
                    "flow_category": "structural",
                    "next_date": datetime(now.year, now.month, 1).strftime("%Y-%m-%d"),
                    "installments_total": 0,
                    "installments_paid": 0,
                    "last_paid_at": None,
                    "created_at": now.isoformat(),
                    "description": f"Costo estimado de recetas: ${meals_total:,}. Ya incluido en tu presupuesto de compra."
                })

        except Exception as synth_err:
            print(f"DEBUG: Error calculating synthetic meals: {synth_err}")
            traceback.print_exc()

        _CACHE[household_id] = {"ts": now, "data": results}
        return results
    except Exception as global_err:
        print(f"DEBUG: Global error in list_commitments: {global_err}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(global_err))


@router.post("/commitments")
def create_commitment(
    payload: dict,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    try:
        household_id = user["household_id"]
        name = (payload.get("name") or "").strip()
        amount = payload.get("amount") or 0
        frequency = payload.get("frequency", "monthly")
        next_date: Optional[str] = payload.get("next_date")
        flow_category = payload.get("flow_category") or "structural"
        installments_total = int(payload.get("installments_total") or 0)
        installments_paid = int(payload.get("installments_paid") or 0)

        if not name:
            raise HTTPException(status_code=400, detail="name is required")

        commitment_data = {
            "household_id": household_id,
            "name": name,
            "amount": float(amount),
            "frequency": frequency,
            "flow_category": flow_category,
            "next_date": next_date,
            "installments_total": installments_total,
            "installments_paid": installments_paid,
            "is_variable": bool(payload.get("is_variable", False)),
        }

        resp = supabase.table("commitments").insert(commitment_data).execute()

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
    import calendar
    _, last_day = calendar.monthrange(year, month)
    day = min(source.day, last_day)
    return date(year, month, day)


@router.patch("/commitments/{commitment_id}")
def update_commitment(
    commitment_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase)
):
    try:
        household_id = user["household_id"]
        
        doc_resp = supabase.table("commitments").select("*").eq("id", commitment_id).eq("household_id", household_id).execute()
        if not doc_resp.data:
            raise HTTPException(status_code=404, detail="commitment not found")
        data = doc_resp.data[0]
        
        updates = {}

        action = payload.get("action")
        if action == "pay":
            transaction_amount = float(payload.get("paid_amount")) if payload.get("paid_amount") is not None else float(data.get("amount", 0))

            updates["last_paid_at"] = datetime.now().isoformat()
            
            current_next = data.get("next_date")
            freq = data.get("frequency", "monthly")

            if current_next:
                 try:
                    curr_date = datetime.strptime(current_next, "%Y-%m-%d").date()
                    
                    if freq == "monthly":
                         updates["next_date"] = _add_months(curr_date, 1).isoformat()
                    elif freq == "weekly":
                         updates["next_date"] = (curr_date + timedelta(days=7)).isoformat()
                    elif freq == "biweekly":
                         updates["next_date"] = (curr_date + timedelta(days=14)).isoformat()
                    elif freq == "yearly":
                         updates["next_date"] = _add_months(curr_date, 12).isoformat()
                    elif freq == "one_time":
                         updates["next_date"] = None
                         updates["is_variable"] = False # to treat basically as completed if desired
                 except Exception:
                     pass
            
            if data.get("installments_total", 0) > 0:
                paid = data.get("installments_paid", 0) + 1
                updates["installments_paid"] = paid

            try:
                # Add transaction on pay
                transaction_data = {
                    "household_id": household_id,
                    "occurred_on": datetime.now().date().isoformat(), 
                    "amount": -abs(transaction_amount),
                    "description": f"Pago de {data.get('name')}",
                    "category_id": None, # Should be a valid uuid, omit or null for now
                    "account_id": None,
                    "status": "posted",
                    "source": "manual",
                }
                # Since transaction needs valid FK, we'll try to get first account 
                fallback = supabase.table("accounts").select("id").eq("household_id", household_id).limit(1).execute()
                if fallback.data:
                    transaction_data["account_id"] = fallback.data[0]["id"]
                    supabase.table("transactions").insert(transaction_data).execute()
            except Exception as e:
                print(f"Error creating transaction: {e}")

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

        for key in ["name", "amount", "frequency", "next_date", "flow_category", "installments_total", "installments_paid", "is_variable"]:
            if key in payload and payload[key] is not None:
                if key == "is_variable":
                    updates[key] = bool(payload[key])
                else:
                    updates[key] = payload[key]

        if not updates:
            return {"success": True, "updated": False}

        supabase.table("commitments").update(updates).eq("id", commitment_id).execute()
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
    supabase: Client = Depends(get_supabase)
):
    try:
        household_id = user["household_id"]
        supabase.table("commitments").delete().eq("id", commitment_id).eq("household_id", household_id).execute()
        _CACHE.pop(household_id, None)
        return {"success": True, "deleted": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
