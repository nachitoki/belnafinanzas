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

_CACHE = {"ts": None, "data": None}
_CACHE_TTL_SECONDS = 120


class DashboardService:
    def __init__(self, db: Client):
        self.db = db

    def get_dashboard_summary(self, household_id: str) -> Dict[str, Any]:
        now = datetime.utcnow()
        if _CACHE["ts"] and _CACHE["data"]:
            # Serve cache immediately if fresh; allow stale cache to avoid blocking UX
            if (now - _CACHE["ts"]).total_seconds() < _CACHE_TTL_SECONDS:
                return _CACHE["data"]

        # 1. Fetch Transactions (Last 90 days for baseline context, though logic only uses window?)
        #Actually logic uses window inside. Passing last 90 days is safe.
        start_date = now - timedelta(days=14)
        docs = self.db.collection('households').document(household_id)\
            .collection('transactions')\
            .where('occurred_on', '>=', start_date)\
            .limit(200)\
            .stream()
        
        transactions = []
        for doc in docs:
            data = doc.to_dict()
            # Handle timestamps from Firestore
            occurred_on = data.get('occurred_on')
            if hasattr(occurred_on, 'timestamp'): # DatetimeWithNanoseconds
                occurred_on = datetime.fromtimestamp(occurred_on.timestamp())
            elif isinstance(occurred_on, str): # Fallback
                try:
                    occurred_on = datetime.fromisoformat(occurred_on)
                except:
                    occurred_on = datetime.utcnow()

            transactions.append(Transaction(
                amount=float(data.get('amount', 0)),
                date=occurred_on,
                category=data.get('category_id', 'unknown'),
                store_id=data.get('store_id'),
                product_id=data.get('product_id')
            ))

        # 2. Compute Spending Zone
        # Current logic computes baseline from THE SAME window transactions.
        # As noted, this is mathematically quirky (deviation of total vs avg of components),
        # but we implement AS SPECIFIED.
        spending_status = compute_spending_zone(transactions, window_days=30)
        
        spending_label = "Dentro de lo normal"
        if spending_status == Status.YELLOW:
            spending_label = "Un poco mas alto de lo usual"
        elif spending_status == Status.RED:
            spending_label = "Nos estamos saliendo"

        # 3. Compute Recurring (Mock for now, or simple query)
        # For MVP, we'll return empty or mock until the Recurring Inference Engine is built.
        # We'll assume everything is Green.
        recurring_statuses = []
        upcoming_items = []
        
        # 4. Compute Strategic Products (Fetch from products collection)
        # We need product prices.
        # Let's fetch 'strategic_products' col
        products_status_list = []
        
        # 5. Global Household Status
        signals = HouseholdSignals(
            spending=spending_status,
            recurring=recurring_statuses,
            products=products_status_list
        )
        
        household_status = compute_household_status(signals)
        status_msg = household_message(household_status)

        # 6. Compute Real Distribution (Current Month)
        month_start = datetime(now.year, now.month, 1)
        
        # Fetch Categories
        cats_ref = self.db.collection('households').document(household_id).collection('categories').stream()
        cat_map = {c.id: c.to_dict() for c in cats_ref}
        
        real_oxigeno = 0.0
        real_vida = 0.0
        real_blindaje = 0.0
        
        # Re-fetch transactions for full current month if needed, or ensure 'transactions' covers it.
        # Existing query was last 14 days. Let's fix transaction fetching to cover full current month + 30 days window.
        # But for now, let's just do a dedicated loop for distribution if we change the query above or lazy load.
        # Optimization: Let's change the top query to be wider: start_date = min(14 days ago, 1st of month)
        # However, to be safe and clean, I will iterate the 'transactions' list if we expand the query, 
        # OR just fetch month transactions here. Fetching is safer for correctness.
        
        dist_docs = self.db.collection('households').document(household_id)\
            .collection('transactions')\
            .where('occurred_on', '>=', month_start)\
            .stream()
            
        for d in dist_docs:
            data = d.to_dict()
            amt = float(data.get('amount', 0))
            if amt >= 0: continue # Skip incomes/transfers, only expenses (negative)
            
            # Expense amount is absolute value of negative
            val = abs(amt)
            
            cat_id = data.get('category_id')
            cat_data = cat_map.get(cat_id, {}) if cat_id else {}
            cat_name = (cat_data.get('name') or "").lower()
             
            # Heuristic: Blindaje
            if "ahorro" in cat_name or "deuda" in cat_name or "inversion" in cat_name or "inversion" in cat_name:
                real_blindaje += val
            elif cat_data.get('essential', False):
                real_oxigeno += val
            else:
                real_vida += val
                
        # Get total income for percentages
        month_overview = self._compute_month_overview(household_id, now, months_ahead=0)
        total_income = month_overview.get('income_total', 0)
        
        dist_result = {
            "oxigeno": 0,
            "vida": 0,
            "blindaje": 0,
            "total_income": total_income,
            "total_expenses": real_oxigeno + real_vida + real_blindaje
        }
        
        if total_income > 0:
            dist_result["oxigeno"] = round((real_oxigeno / total_income) * 100)
            dist_result["vida"] = round((real_vida / total_income) * 100)
            dist_result["blindaje"] = round((real_blindaje / total_income) * 100)

        result = {
            "household_status": household_status.value,
            "status_message": status_msg,
            "upcoming_items": upcoming_items, 
            "spending_zone": {
                "status": spending_status.value,
                "label": spending_label
            },
            "month_overview": self._compute_month_overview(household_id, now, months_ahead=3),
            "distribution_real": dist_result
        }
        _CACHE["ts"] = now
        _CACHE["data"] = result
        return result

    def _compute_month_overview(self, household_id: str, now: datetime, months_ahead: int = 3) -> Dict[str, Any]:
        month_start = datetime(now.year, now.month, 1)

        def parse_date(value) -> date | None:
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

        incomes_total = 0.0
        commitments_total = 0.0
        events_mandatory = 0.0
        events_optional = 0.0
        projections = []

        # Preload collections
        incomes_docs = self.db.collection("households").document(household_id)\
            .collection("incomes").limit(200).stream()
        incomes = [d.to_dict() for d in incomes_docs]
        var_by_name_month: Dict[str, Dict[str, float]] = {}
        var_min_by_name: Dict[str, float] = {}
        for data in incomes:
            if not data.get("is_variable", False):
                continue
            name = (data.get("name") or "Sin nombre").strip()
            min_amount = data.get("min_amount")
            if min_amount is None:
                min_amount = data.get("amount", 0)
            min_amount = float(min_amount or 0)
            if name not in var_min_by_name:
                var_min_by_name[name] = min_amount
            else:
                var_min_by_name[name] = max(var_min_by_name[name], min_amount)
            month_value = data.get("month")
            if not month_value:
                next_date_value = parse_date(data.get("next_date"))
                if next_date_value:
                    month_value = next_date_value.strftime("%Y-%m")
            if month_value:
                var_by_name_month.setdefault(name, {})
                var_by_name_month[name][month_value] = var_by_name_month[name].get(month_value, 0) + float(data.get("amount", 0) or 0)

        def month_key(dt: datetime) -> str:
            return dt.strftime("%Y-%m")

        def last_3_months_keys(ref: datetime) -> list[str]:
            keys = []
            d = datetime(ref.year, ref.month, 1)
            for _ in range(3):
                keys.append(month_key(d))
                d = d - timedelta(days=1)
                d = datetime(d.year, d.month, 1)
            return keys

        def projected_variable_total(target_month_key: str) -> float:
            total = 0.0
            for name, min_amount in var_min_by_name.items():
                actual = var_by_name_month.get(name, {}).get(target_month_key)
                if actual is not None:
                    continue
                last3 = last_3_months_keys(now)
                avg3 = sum(var_by_name_month.get(name, {}).get(m, 0) for m in last3) / 3
                total += max(min_amount, avg3)
            return total
        for data in incomes:
            amount = float(data.get("amount", 0) or 0)
            frequency = data.get("frequency", "monthly")
            next_date = parse_date(data.get("next_date"))

            if frequency == "monthly":
                incomes_total += amount
            elif frequency == "weekly":
                incomes_total += amount * 4
            elif frequency == "biweekly":
                incomes_total += amount * 2
            elif frequency == "one_time":
                if next_date and month_start.date() <= next_date < (month_start + timedelta(days=31)).date():
                    incomes_total += amount
            elif frequency == "yearly":
                if next_date and month_start.date() <= next_date < (month_start + timedelta(days=31)).date():
                    incomes_total += amount
        incomes_total += projected_variable_total(month_key(month_start))

        # Commitments
        commitments_docs = self.db.collection("households").document(household_id)\
            .collection("commitments").limit(200).stream()
        commitments = [d.to_dict() for d in commitments_docs]
        for data in commitments:
            amount = float(data.get("amount", 0) or 0)
            frequency = data.get("frequency", "monthly")
            next_date = parse_date(data.get("next_date"))

            if frequency == "monthly":
                commitments_total += amount
            elif frequency == "weekly":
                commitments_total += amount * 4
            elif frequency == "biweekly":
                commitments_total += amount * 2
            elif frequency == "one_time":
                if next_date and month_start.date() <= next_date < (month_start + timedelta(days=31)).date():
                    commitments_total += amount
            elif frequency == "yearly":
                if next_date and month_start.date() <= next_date < (month_start + timedelta(days=31)).date():
                    commitments_total += amount

        # Events
        events_docs = self.db.collection("households").document(household_id)\
            .collection("events").limit(200).stream()
        events = [d.to_dict() for d in events_docs]
        for data in events:
            amount = float(data.get("amount_estimate", 0) or 0)
            event_date = parse_date(data.get("date"))
            if not event_date or not (month_start.date() <= event_date < (month_start + timedelta(days=31)).date()):
                continue
            if data.get("is_mandatory", False):
                events_mandatory += amount
            else:
                events_optional += amount

        projected_balance = incomes_total - commitments_total - events_mandatory
        optional_budget = max(projected_balance, 0)

        # Projections for next months (simple model)
        for i in range(months_ahead + 1):
            m_start = datetime(now.year, now.month, 1) + timedelta(days=31 * i)
            m_end = m_start + timedelta(days=31)

            def in_month(d: date | None) -> bool:
                if not d:
                    return False
                return m_start.date() <= d < m_end.date()

            inc = 0.0
            for data in incomes:
                amount = float(data.get("amount", 0) or 0)
                frequency = data.get("frequency", "monthly")
                next_date = parse_date(data.get("next_date"))
                if frequency == "monthly":
                    inc += amount
                elif frequency == "weekly":
                    inc += amount * 4
                elif frequency == "biweekly":
                    inc += amount * 2
                elif frequency == "one_time":
                    if in_month(next_date):
                        inc += amount
                elif frequency == "yearly":
                    if in_month(next_date):
                        inc += amount
            inc += projected_variable_total(month_key(m_start))

            com = 0.0
            for data in commitments:
                amount = float(data.get("amount", 0) or 0)
                frequency = data.get("frequency", "monthly")
                next_date = parse_date(data.get("next_date"))
                if frequency == "monthly":
                    com += amount
                elif frequency == "weekly":
                    com += amount * 4
                elif frequency == "biweekly":
                    com += amount * 2
                elif frequency == "one_time":
                    if in_month(next_date):
                        com += amount
                elif frequency == "yearly":
                    if in_month(next_date):
                        com += amount

            ev_m = 0.0
            ev_o = 0.0
            for data in events:
                amount = float(data.get("amount_estimate", 0) or 0)
                event_date = parse_date(data.get("date"))
                if not in_month(event_date):
                    continue
                if data.get("is_mandatory", False):
                    ev_m += amount
                else:
                    ev_o += amount

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

