from datetime import datetime, timedelta, date, timezone
from typing import List, Dict, Any
from supabase import Client as SupabaseClient
from app.domain.models import Transaction, RecurringItem, ProductPrice, HouseholdSignals, Status
from app.domain.logic import (
    compute_spending_zone,
    compute_recurring_status,
    compute_product_status,
    compute_household_status,
    household_message
)

_CACHE = {}
_CACHE_TTL_SECONDS = 60  # Cache dashboard results for 60 seconds

class DashboardService:
    def __init__(self, supabase: SupabaseClient):
        self.supabase = supabase

    def get_dashboard_summary(self, household_id: str, month: str = None) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        
        # Cache key depends on the month
        cache_key = f"{household_id}_{month}" if month else household_id
        cached = _CACHE.get(cache_key)
        
        if cached and cached.get("ts") and cached.get("data"):
            if (now - cached["ts"]).total_seconds() < _CACHE_TTL_SECONDS:
                return cached["data"]

        target_date = now
        if month:
            try:
                # target_date as midnight UTC
                target_date = datetime.strptime(month, "%Y-%m").replace(tzinfo=timezone.utc)
            except:
                pass

        result = self._get_summary_supabase(household_id, target_date)
        
        _CACHE[cache_key] = {"ts": now, "data": result}
        return result

    def _get_summary_supabase(self, household_id: str, target_date: datetime) -> Dict[str, Any]:
        # Una sola consulta relacional para todo (idealmente, pero por tiempo haremos consultas paralelas en Supabase que son 10x más rápidas)
        # B) Commitments
        commitments = self.supabase.table("commitments").select("*").eq("household_id", household_id).execute().data
        
        # --- Synthetic Commitments Logic (Meals + Shopping) ---
        try:
            start_of_month_str = target_date.replace(day=1).strftime("%Y-%m-%d")
            month_key = target_date.strftime("%Y-%m")
            
            if target_date.month == 12:
                next_month_start = target_date.replace(year=target_date.year + 1, month=1, day=1).strftime("%Y-%m-%d")
            else:
                next_month_start = target_date.replace(month=target_date.month + 1, day=1).strftime("%Y-%m-%d")
            
            # Meals Total (Planificados en el mes M)
            meal_resp = self.supabase.table("meal_plans").select("recipe_cost").eq("household_id", household_id).gte("date", start_of_month_str).execute()
            meals_total = sum((m.get("recipe_cost") or 0) for m in meal_resp.data)
            
            # Shopping List Extras Total (Extras en el mes M)
            shop_resp = self.supabase.table("shopping_list").select("estimated_cost").eq("household_id", household_id).eq("month", month_key).execute()
            extras_total = sum((s.get("estimated_cost") or 0) for s in shop_resp.data)
            
            # La suma se proyecta al mes M+1 porque se paga con tarjeta Diferida (ADR 001)
            if meals_total > 0 or extras_total > 0:
                commitments.append({
                    "id": "synthetic_shopping",
                    "name": "Total Compra Grande (Estimado Prox Mes)",
                    "amount": meals_total + extras_total,
                    "frequency": "monthly",
                    "flow_category": "structural",
                    "next_date": next_month_start, # Deuda proyectada
                    "description": f"Basado en consumos de {month_key}. Almuerzos: ${meals_total:,} + Despensa: ${extras_total:,}"
                })
        except Exception as e:
            # Non-blocking error for synthetic logic
            pass
            
        # C) Events
        events = self.supabase.table("events").select("*").eq("household_id", household_id).execute().data
        # D) Incomes
        incomes = self.supabase.table("incomes").select("*").eq("household_id", household_id).execute().data
        # E) Categories
        cat_list = self.supabase.table("categories").select("*").eq("household_id", household_id).execute().data
        cat_map = {c['id']: c for c in cat_list}
        
        # A) Transactions (last 45 days relative to target_date)
        month_start = datetime(target_date.year, target_date.month, 1, tzinfo=timezone.utc)
        query_start = (month_start - timedelta(days=45)).isoformat()
        trans_list = self.supabase.table("transactions").select("*").eq("household_id", household_id).gte("occurred_on", query_start).execute().data
        
        return self._process_dashboard_data(household_id, target_date, trans_list, commitments, events, incomes, cat_map)



    def _process_dashboard_data(self, household_id: str, target_date: datetime, trans_list: List[Dict], commitments: List[Dict], events: List[Dict], incomes: List[Dict], cat_map: Dict) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        month_start = datetime(target_date.year, target_date.month, 1, tzinfo=timezone.utc)
        all_transactions_data = []
        transactions_objects = []
        real_oxigeno = 0.0
        real_vida = 0.0
        real_blindaje = 0.0

        for data in trans_list:
            occurred_on = data.get('occurred_on')
            
            if isinstance(occurred_on, str):
                try:
                    # ISO format parsing usually handles +00:00 correctly
                    occurred_on = datetime.fromisoformat(occurred_on.replace('Z', '+00:00'))
                    if occurred_on.tzinfo is None:
                        occurred_on = occurred_on.replace(tzinfo=timezone.utc)
                except:
                    occurred_on = datetime.now(timezone.utc)
            elif isinstance(occurred_on, datetime):
                if occurred_on.tzinfo is None:
                    occurred_on = occurred_on.replace(tzinfo=timezone.utc)
            else:
                 occurred_on = datetime.now(timezone.utc)
            
            data['parsed_date'] = occurred_on
            all_transactions_data.append(data)
            
            if (now - occurred_on).days <= 30:
                try:
                    amt = float(data.get('amount', 0))
                except:
                    amt = 0.0
                    
                transactions_objects.append(Transaction(
                    amount=amt,
                    date=occurred_on,
                    category=data.get('category_id', 'unknown'),
                    store_id=data.get('store_id'),
                    product_id=data.get('product_id')
                ))

            if occurred_on >= month_start:
                try:
                    amt = float(data.get('amount', 0))
                except:
                    amt = 0.0

                if amt < 0:
                    val = abs(amt)
                    cat_id = data.get('category_id')
                    cat_item = cat_map.get(cat_id, {}) if cat_id else {}
                    cat_name = (cat_item.get('name') or "").lower()
                    
                    desc = (data.get('description') or "").lower()
                    
                    oxigeno_keywords = [
                        "supermercado", "jumbo", "lider", "unimarc", "santa isabel", "tottus", "acunta", "mayorista",
                        "cge", "enel", "aguas", "esval", "essbio", "metrogas", "lipigas", "abastible",
                        "wom", "entel", "movistar", "btub", "vtr", "claro", "mundo",
                        "farmacia", "cruz verde", "ahumada", "salcobrand", "doctor", "medico", "salud", "clinica",
                        "colegio", "jardin", "educacion", "universidad",
                        "arriendo", "gc", "gasto comun", "contribucion"
                    ]
                    
                    blindaje_keywords = ["ahorro", "inversion", "fintual", "racional", "coopeuch", "deposito", "deuda", "credito", "hipotecario"]
                    
                    is_blindaje = "ahorro" in cat_name or "deuda" in cat_name or "inversion" in cat_name or any(k in desc for k in blindaje_keywords)
                    is_oxigeno = cat_item.get('essential', False) or any(k in desc for k in oxigeno_keywords) or any(k in cat_name for k in oxigeno_keywords)
                    
                    if is_blindaje:
                        real_blindaje += val
                    elif is_oxigeno:
                        real_oxigeno += val
                    else:
                        real_vida += val

        # 2. Spending Zone
        spending_status = compute_spending_zone(transactions_objects, window_days=30)
        spending_label = "Dentro de lo normal"
        if spending_status == Status.YELLOW:
            spending_label = "Un poco mas alto de lo usual"
        elif spending_status == Status.RED:
            spending_label = "Nos estamos saliendo"

        # 3. Compute Horizon Items (Upcoming)
        # Logic ported from horizon.py
        horizon_date = now.date() + timedelta(days=60)
        budget_ref = 2000000
        upcoming_items = []

        def _pdate(v):
            if not v: return None
            if hasattr(v, 'date') and not isinstance(v, str): return v.date()
            try:
                dt = datetime.fromisoformat(str(v).replace('Z', '+00:00'))
                return dt.date()
            except: return None
        
        # Commitments Horizon
        for c in commitments:
            nd = _pdate(c.get("next_date"))
            
            # Check if paid this month
            last_paid = _pdate(c.get("last_paid_at"))
            is_paid_this_month = last_paid and last_paid.month == now.month and last_paid.year == now.year
            
            if is_paid_this_month:
                continue
                
            # Include if it's within horizon OR if it's overdue (nd < now)
            if nd and nd <= horizon_date:
                is_overdue = nd < now.date()
                upcoming_items.append({
                    "id": c.get("id"),
                    "type": "commitment",
                    "label": c.get("name"),
                    "date": nd.isoformat(),
                    "amount": c.get("amount", 0),
                    "severity": "critical" if is_overdue else "high",
                    "is_overdue": is_overdue,
                    "flow_category": c.get("flow_category"),
                    "provisioned": c.get("flow_category") == "provision",
                    "impact_pct": round((float(c.get("amount", 0) or 0) / budget_ref) * 100, 1)
                })
        
        # Events Horizon
        for e in events:
            ed = _pdate(e.get("date"))
            if not ed or not (now.date() <= ed <= horizon_date):
                continue
            amt = float(e.get("amount_estimate", 0) or 0)
            fc = e.get("flow_category")
            prov = fc == "provision"
            
            # Months logic (simplified)
            months_left = 0
            monthly_amt = amt
            if prov and ed > now.date():
                months_left = max(1, (ed.year - now.date().year) * 12 + (ed.month - now.date().month) + 1)
                monthly_amt = round(amt / months_left, 2)

            upcoming_items.append({
                "type": "event",
                "label": e.get("name"),
                "date": ed.isoformat(),
                "amount": monthly_amt,
                "original_amount": amt,
                "provisioned": prov,
                "months_remaining": months_left if prov else None,
                "severity": "high" if e.get("is_mandatory", False) else "medium",
                "flow_category": fc,
                "impact_pct": round((monthly_amt / budget_ref) * 100, 1)
            })
            
        upcoming_items.sort(key=lambda x: x.get("date", ""))
        upcoming_items = upcoming_items[:20]

        # 6. Real Distribution Result
        month_overview = self._compute_month_overview_memory(
            incomes, commitments, events, household_id, target_date, months_ahead=3
        )
        total_income = month_overview.get('income_total', 0)
        
        # Override Status if Deficit is significant (e.g. < -50k CLP)
        projected_balance = month_overview.get('projected_balance', 0)
        if projected_balance < -50000:
            spending_status = Status.RED
            spending_label = "Déficit Proyectado Crítico"
            # Update signals to reflect this force override
            # Actually, compute_household_status uses signals.spending, so updating spending_status here is enough BEFORE creating signals.
        
        # 5. Global Household Status (Moved down to capture the override)
        products_status_list = [] 
        signals = HouseholdSignals(
            spending=spending_status,
            recurring=[], 
            products=products_status_list
        )
        household_status = compute_household_status(signals)
        status_msg = household_message(household_status)
        
        if projected_balance < -50000:
             status_msg = "Alerta: Se proyecta déficit este mes."

        dist_result = {
            "oxigeno": 0, "vida": 0, "blindaje": 0,
            "total_income": total_income,
            "total_expenses": real_oxigeno + real_vida + real_blindaje
        }
        if total_income > 0:
            dist_result["oxigeno"] = round((real_oxigeno / total_income) * 100)
            dist_result["vida"] = round((real_vida / total_income) * 100)
            dist_result["blindaje"] = round((real_blindaje / total_income) * 100)

        # 7. Food Budget Logic
        # Fetch budget from household metadata or default
        resp = self.supabase.table('households').select('settings').eq('id', household_id).execute()
        settings_data = {}
        if resp.data and resp.data[0].get('settings'):
             settings_data = resp.data[0]['settings']
        
        # User requested 500k default
        food_budget_limit = float(settings_data.get('food_budget', 500000))
        
        # Calculate food spending (current month)
        food_spent = 0.0
        food_keywords = ["supermercado", "comida", "alimento", "restaurante", "jumbo", "lider", "unimarc", "santa isabel", "tottus", "acunta", "provision", "carniceria", "feria", "verdura"]
        
        for data in all_transactions_data:
             parsed_date = data.get('parsed_date')
             if parsed_date and parsed_date >= month_start:
                 amount = float(data.get('amount', 0))
                 if amount < 0: # Expense
                     cat_id = data.get('category_id')
                     cat_item = cat_map.get(cat_id, {})
                     cat_name = (cat_item.get('name') or "").lower()
                     description = (data.get('description') or "").lower()
                     store_name = (data.get('store_name') or "").lower()
                     
                     is_food = any(k in cat_name for k in food_keywords) or \
                               any(k in description for k in food_keywords) or \
                               any(k in store_name for k in food_keywords) or \
                               cat_item.get('essential', False) and ("comida" in cat_name or "super" in cat_name)
                               
                     if is_food:
                         food_spent += abs(amount)

        
        # Calculate Pending Commitments Amount
        pending_commitments_amount = 0.0
        current_month_str = now.strftime("%Y-%m")
        for c in commitments:
            # Check if paid this month
            last_paid = c.get("last_paid_at")
            is_paid = False
            if last_paid:
                try:
                    lp_date = datetime.fromisoformat(str(last_paid).replace('Z', '+00:00'))
                    if lp_date.year == now.year and lp_date.month == now.month:
                        is_paid = True
                except: pass
            
            if not is_paid:
                # Count if it's due this month OR if it's overdue (next_date < start of month)
                nd = _pdate(c.get("next_date"))
                if nd and nd < (month_start + timedelta(days=31)).date():
                    pending_commitments_amount += float(c.get("amount", 0) or 0)

        result = {
            "household_status": household_status.value,
            "status_message": status_msg,
            "upcoming_items": upcoming_items, 
            "spending_zone": { "status": spending_status.value, "label": spending_label },
            "month_overview": month_overview,
            "distribution_real": dist_result,
            "pending_commitments_amount": round(pending_commitments_amount),
            "food_budget": {
                "limit": food_budget_limit,
                "spent": food_spent,
                "remaining": max(food_budget_limit - food_spent, 0),
                "progress": min(100, round((food_spent / food_budget_limit) * 100)) if food_budget_limit > 0 else 0
            }
        }
        return result

    def update_settings(self, household_id: str, updates: Dict[str, Any]) -> None:
        """Update household settings (e.g. food_budget)"""
        # First retrieve existing settings
        resp = self.supabase.table('households').select('settings').eq('id', household_id).execute()
        current_settings = {}
        if resp.data and resp.data[0].get('settings'):
            current_settings = resp.data[0]['settings']
            
        # Merge updates
        for k, v in updates.items():
            current_settings[k] = v
            
        self.supabase.table('households').update({'settings': current_settings}).eq('id', household_id).execute()
        # Invalidate cache
        _CACHE.pop(household_id, None)

    def _compute_month_overview_memory(self, incomes, commitments, events, household_id, now, months_ahead=3):
        # Ensure now is aware for comparison
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
        month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

        def parse_date(value):
            if not value: return None
            if hasattr(value, "date") and not isinstance(value, str): return v.date() # Simplified but safe
            try: 
                dt = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
                return dt.date()
            except: return None
        
        # Variable Incomes Logic
        var_by_name_month = {}
        var_min_by_name = {}
        for data in incomes:
            if not data.get("is_variable", False): continue
            name = (data.get("name") or "Sin nombre").strip()
            min_amount = float(data.get("min_amount") or data.get("amount") or 0)
            var_min_by_name[name] = max(var_min_by_name.get(name, 0), min_amount)
            
            month_val = data.get("month")
            if not month_val:
                 nd = parse_date(data.get("next_date"))
                 if nd: month_val = nd.strftime("%Y-%m")
            if month_val:
                var_by_name_month.setdefault(name, {})
                var_by_name_month[name][month_val] = var_by_name_month[name].get(month_val, 0) + float(data.get("amount", 0))

        def month_key(dt): return dt.strftime("%Y-%m")
        
        def projected_variable_total(target_month_key):
            total = 0.0
            for name, min_amt in var_min_by_name.items():
                 if var_by_name_month.get(name, {}).get(target_month_key) is not None: continue
                 total += min_amt
            return total

        incomes_total = 0.0
        commitments_total = 0.0
        events_mandatory = 0.0
        events_optional = 0.0
        
        # Current month totals
        for d in incomes:
            amt = float(d.get("amount") or 0)
            freq = d.get("frequency", "monthly")
            nd = parse_date(d.get("next_date"))
            doc_month = d.get("month") # e.g. "2026-02"
            
            target_month_str = month_key(month_start)
            
            if freq == "monthly":
                # Count if it matches target month OR if it has NO doc_month (legacy perpetual)
                if not doc_month or doc_month == target_month_str:
                    incomes_total += amt
            elif freq == "weekly": 
                if not doc_month or doc_month == target_month_str:
                    incomes_total += amt * 4
            elif freq == "biweekly": 
                if not doc_month or doc_month == target_month_str:
                    incomes_total += amt * 2
            elif freq in ["one_time", "yearly"]:
                # For one_time/yearly, it MUST match the target month exactly
                # If doc_month is set, use it. Otherwise, use next_date.
                if doc_month:
                    if doc_month == target_month_str:
                        incomes_total += amt
                elif nd and month_start.date() <= nd < (month_start+timedelta(days=31)).date():
                    incomes_total += amt
        incomes_total += projected_variable_total(month_key(month_start))

        for d in commitments:
            amt = float(d.get("amount") or 0)
            freq = d.get("frequency", "monthly")
            nd = parse_date(d.get("next_date"))
            if freq == "monthly": commitments_total += amt
            elif freq == "weekly": commitments_total += amt * 4
            elif freq == "biweekly": commitments_total += amt * 2
            elif freq in ["one_time", "yearly"] and nd and month_start.date() <= nd < (month_start+timedelta(days=31)).date():
                commitments_total += amt

        for d in events:
             amt = float(d.get("amount_estimate") or 0)
             ed = parse_date(d.get("date"))
             if ed and month_start.date() <= ed < (month_start+timedelta(days=31)).date():
                 if d.get("is_mandatory"): events_mandatory += amt
                 else: events_optional += amt

        projected_balance = incomes_total - commitments_total - events_mandatory
        optional_budget = max(projected_balance, 0)

        projections = []
        for i in range(months_ahead + 1):
             # Simplified month increment logic
             year = now.year + (now.month + i - 1) // 12
             month = (now.month + i - 1) % 12 + 1
             m_start = datetime(year, month, 1, tzinfo=timezone.utc)
             m_end = datetime(year + (month // 12), (month % 12) + 1, 1, tzinfo=timezone.utc)
             def in_month(d): return d and m_start.date() <= d < m_end.date()
             
             inc = projected_variable_total(month_key(m_start))
             for d in incomes:
                 amt = float(d.get("amount") or 0)
                 # simplified freq logic for projection
                 freq = d.get("frequency", "monthly")
                 nd = parse_date(d.get("next_date"))
                 if freq == "monthly": inc += amt
                 elif freq == "weekly": inc += amt * 4
                 elif freq == "biweekly": inc += amt * 2
                 elif freq in ["one_time", "yearly"] and in_month(nd): inc += amt
            
             com = 0.0
             for d in commitments:
                 amt = float(d.get("amount") or 0)
                 freq = d.get("frequency", "monthly")
                 nd = parse_date(d.get("next_date"))
                 if freq == "monthly": com += amt
                 elif freq == "weekly": com += amt * 4
                 elif freq == "biweekly": com += amt * 2
                 elif freq in ["one_time", "yearly"] and in_month(nd): com += amt
             
             ev_m = 0.0; ev_o = 0.0
             for d in events:
                 amt = float(d.get("amount_estimate") or 0)
                 ed = parse_date(d.get("date"))
                 if in_month(ed):
                     if d.get("is_mandatory"): ev_m += amt
                     else: ev_o += amt
            
             projections.append({
                 "month": m_start.strftime("%Y-%m"),
                 "income_total": round(inc, 2),
                 "commitments_total": round(com, 2),
                 "events_mandatory_total": round(ev_m, 2),
                 "events_optional_total": round(ev_o, 2),
                 "projected_balance": round(inc - com - ev_m, 2),
                 "optional_budget": round(max(inc - com - ev_m, 0), 2)
             })

        return {
            "income_total": round(incomes_total, 2),
            "commitments_total": round(commitments_total, 2),
            "events_mandatory_total": round(events_mandatory, 2),
            "events_optional_total": round(events_optional, 2),
            "projected_balance": round(projected_balance, 2),
            "optional_budget": round(optional_budget, 2),
            "projections": projections
        }
