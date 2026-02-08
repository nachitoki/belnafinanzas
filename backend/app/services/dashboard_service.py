from datetime import datetime, timedelta, date
from typing import List, Dict, Any
from google.cloud.firestore import Client
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
    def __init__(self, db: Client):
        self.db = db

    def get_dashboard_summary(self, household_id: str) -> Dict[str, Any]:
        now = datetime.utcnow()
        cached = _CACHE.get(household_id)
        if cached and cached.get("ts") and cached.get("data"):
            if (now - cached["ts"]).total_seconds() < _CACHE_TTL_SECONDS:
                return cached["data"]

        # 1. Fetch Collections Concurrent-ish (limit 300 each)
        # We fetch all core collections once to avoid N queries
        
        # A) Transactions
        start_date_zone = now - timedelta(days=45)
        month_start = datetime(now.year, now.month, 1)
        query_start = min(start_date_zone, month_start) - timedelta(days=1)
        
        trans_docs = self.db.collection('households').document(household_id)\
            .collection('transactions')\
            .where('occurred_on', '>=', query_start)\
            .limit(300)\
            .stream()

        # B) Commitments
        comm_docs = self.db.collection('households').document(household_id)\
            .collection('commitments').limit(200).stream()
        commitments = [d.to_dict() for d in comm_docs]

        # C) Events
        event_docs = self.db.collection('households').document(household_id)\
            .collection('events').limit(200).stream()
        events = [d.to_dict() for d in event_docs]

        # D) Incomes (needed for month overview)
        income_docs = self.db.collection('households').document(household_id)\
            .collection('incomes').limit(200).stream()
        incomes = [d.to_dict() for d in income_docs]

        # Process Transactions
        all_transactions_data = []
        transactions_objects = []
        real_oxigeno = 0.0
        real_vida = 0.0
        real_blindaje = 0.0
        
        # Categories Map
        cats_ref = self.db.collection('households').document(household_id)\
            .collection('categories').stream()
        cat_map = {c.id: c.to_dict() for c in cats_ref}

        for doc in trans_docs:
            data = doc.to_dict()
            occurred_on = data.get('occurred_on')
            if hasattr(occurred_on, 'timestamp'):
                occurred_on = datetime.fromtimestamp(occurred_on.timestamp())
            elif isinstance(occurred_on, str):
                try:
                    occurred_on = datetime.fromisoformat(occurred_on)
                except:
                    # Fallback for safe date
                    occurred_on = datetime.utcnow()
            else:
                 # Fallback if None or other type
                 occurred_on = datetime.utcnow()
            
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
                amt = float(data.get('amount', 0))
                if amt < 0:
                    val = abs(amt)
                    cat_id = data.get('category_id')
                    cat_data = cat_map.get(cat_id, {}) if cat_id else {}
                    cat_name = (cat_data.get('name') or "").lower()
                    
                    # Smart Classification Logic
                    desc = (data.get('description') or "").lower()
                    store = (data.get('store_id') or "").lower() 
                    
                    def safe_float(v):
                        try: return float(v)
                        except: return 0.0

                    val = abs(safe_float(data.get('amount')))
                    # Utilities, Supermarkets, Health, Education, Telecom
                    oxigeno_keywords = [
                        "supermercado", "jumbo", "lider", "unimarc", "santa isabel", "tottus", "acunta", "mayorista",
                        "cge", "enel", "aguas", "esval", "essbio", "metrogas", "lipigas", "abastible",
                        "wom", "entel", "movistar", "btub", "vtr", "claro", "mundo",
                        "farmacia", "cruz verde", "ahumada", "salcobrand", "doctor", "medico", "salud", "clinica",
                        "colegio", "jardin", "educacion", "universidad",
                        "arriendo", "gc", "gasto comun", "contribucion"
                    ]
                    
                    # Keywords for Blindaje (Savings/Debt)
                    blindaje_keywords = ["ahorro", "inversion", "fintual", "racional", "coopeuch", "deposito", "deuda", "credito", "hipotecario"]
                    
                    is_blindaje = "ahorro" in cat_name or "deuda" in cat_name or "inversion" in cat_name or any(k in desc for k in blindaje_keywords)
                    is_oxigeno = cat_data.get('essential', False) or any(k in desc for k in oxigeno_keywords) or any(k in cat_name for k in oxigeno_keywords)
                    
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
            if hasattr(v, 'date'): return v.date()
            try: return datetime.fromisoformat(str(v)).date()
            except: return None
        
        # Commitments Horizon
        for c in commitments:
            nd = _pdate(c.get("next_date"))
            if nd and now.date() <= nd <= horizon_date:
                upcoming_items.append({
                    "type": "commitment",
                    "label": c.get("name"),
                    "date": nd.isoformat(),
                    "amount": c.get("amount", 0),
                    "severity": "high",
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
            incomes, commitments, events, household_id, now, months_ahead=3
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
        household_ref = self.db.collection('households').document(household_id)
        household_snap = household_ref.get()
        household_data = household_snap.to_dict() if household_snap.exists else {}
        settings_data = household_data.get('settings', {})
        
        # User requested 500k default
        food_budget_limit = float(settings_data.get('food_budget', 500000))
        
        # Calculate food spending (current month)
        food_spent = 0.0
        # Identify "Food" categories - simplified matching
        # In a robust system, we'd use a flag in the category document, but name matching works for MVP
        food_keywords = ["supermercado", "comida", "alimento", "restaurante", "jumbo", "lider", "unimarc", "santa isabel"]
        
        for tx in transactions_objects:
            # We filter transactions from step 1 (last 30 days) but we specifically want CURRENT MONTH for budget
            if tx.date >= month_start:
                 # Check category name from map
                 cat_name = (cat_map.get(tx.category, {}).get('name') or "").lower()
                 if any(k in cat_name for k in food_keywords):
                     food_spent += tx.amount

        # Also check raw transactions that might not be in transactions_objects if window differs, 
        # but transactions_objects is last 30 days. 
        # Actually, query_start was set to month_start - 1 so we have cover.
        # Wait, trans_docs (all_transactions_data) covers query_start (start of month).
        # transactions_objects covers last 30 days.
        # We should iterate over `all_transactions_data` for accuracy if current day > 30th.
        
        food_spent = 0.0
        for data in all_transactions_data:
             parsed_date = data.get('parsed_date')
             if parsed_date and parsed_date >= month_start:
                 amount = float(data.get('amount', 0))
                 if amount < 0: # Expense
                     cat_id = data.get('category_id')
                     cat_name = (cat_map.get(cat_id, {}).get('name') or "").lower()
                     if any(k in cat_name for k in food_keywords):
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
                    lp_date = datetime.fromisoformat(str(last_paid))
                    if lp_date.strftime("%Y-%m") == current_month_str:
                        is_paid = True
                except: pass
            
            if not is_paid:
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
        _CACHE[household_id] = {"ts": now, "data": result}
        return result

    def update_settings(self, household_id: str, updates: Dict[str, Any]) -> None:
        """Update household settings (e.g. food_budget)"""
        ref = self.db.collection('households').document(household_id)
        # Use set with merge to update deep fields map
        # Firestore dot notation for nested update
        update_dict = {}
        for k, v in updates.items():
            update_dict[f"settings.{k}"] = v
            
        ref.update(update_dict)
        # Invalidate cache
        _CACHE.pop(household_id, None)

    def _compute_month_overview_memory(self, incomes, commitments, events, household_id, now, months_ahead=3):
        month_start = datetime(now.year, now.month, 1)

        def parse_date(value):
            if not value: return None
            if hasattr(value, "date"): return value.date()
            try: return datetime.fromisoformat(str(value)).date()
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
            if freq == "monthly": incomes_total += amt
            elif freq == "weekly": incomes_total += amt * 4
            elif freq == "biweekly": incomes_total += amt * 2
            elif freq in ["one_time", "yearly"] and nd and month_start.date() <= nd < (month_start+timedelta(days=31)).date():
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
             m_start = datetime(now.year, now.month, 1) + timedelta(days=31 * i)
             m_end = m_start + timedelta(days=31)
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
