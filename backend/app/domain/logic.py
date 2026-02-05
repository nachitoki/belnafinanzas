from datetime import datetime, timedelta
from typing import List
from .models import Status, Transaction, RecurringItem, ProductPrice, HouseholdSignals


def mean(values: List[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def percentile(values: List[float], p: float) -> float:
    if not values:
        return 0.0
    values_sorted = sorted(values)
    k = int(len(values_sorted) * p)
    return values_sorted[min(k, len(values_sorted) - 1)]


def compute_spending_zone(
    transactions: List[Transaction],
    window_days: int = 30
) -> Status:
    now = datetime.utcnow()
    window_start = now - timedelta(days=window_days)
    current_year = now.year

    def expense_amount(t: Transaction) -> float:
        # Expenses are stored as negative values; ignore non-expenses
        return -t.amount if t.amount < 0 else 0.0

    # Recent window total (only expenses)
    recent_total = sum(
        expense_amount(t)
        for t in transactions
        if t.date >= window_start and t.date.year == current_year
    )

    # Historical baseline: monthly totals in the current year, excluding current month
    month_totals: dict[int, float] = {}
    for t in transactions:
        if t.date.year != current_year:
            continue
        if t.date.month == now.month:
            continue
        amt = expense_amount(t)
        if amt <= 0:
            continue
        month_totals[t.date.month] = month_totals.get(t.date.month, 0.0) + amt

    baseline = mean(list(month_totals.values()))

    if baseline <= 0:
        return Status.GREEN

    deviation = (recent_total - baseline) / baseline

    if deviation > 0.25:
        return Status.RED
    elif deviation > 0.10:
        return Status.YELLOW
    else:
        return Status.GREEN


def compute_recurring_status(
    item: RecurringItem,
    tolerance_ratio: float = 0.20
) -> Status:
    now = datetime.utcnow()
    expected_next = item.last_paid_date + timedelta(days=item.expected_interval_days)

    tolerance = item.expected_interval_days * tolerance_ratio

    if now <= expected_next:
        return Status.GREEN
    elif now <= expected_next + timedelta(days=tolerance):
        return Status.YELLOW
    else:
        return Status.RED


def compute_product_status(
    prices: List[ProductPrice]
) -> Status:
    if len(prices) < 3:
        return Status.GREEN

    values = [p.unit_price for p in prices]

    p50 = percentile(values, 0.50)
    p75 = percentile(values, 0.75)
    latest = prices[-1].unit_price

    if latest > p75:
        return Status.RED
    elif latest > p50:
        return Status.YELLOW
    else:
        return Status.GREEN


def compute_household_status(signals: HouseholdSignals) -> Status:
    if (
        signals.spending == Status.RED or
        Status.RED in signals.recurring or
        Status.RED in signals.products
    ):
        return Status.RED

    if (
        signals.spending == Status.YELLOW or
        Status.YELLOW in signals.recurring or
        Status.YELLOW in signals.products
    ):
        return Status.YELLOW

    return Status.GREEN


def household_message(status: Status) -> str:
    if status == Status.GREEN:
        return "El hogar está tranquilo."
    if status == Status.YELLOW:
        return "Hay cosas que conviene mirar."
    return "Este periodo requiere atención."
