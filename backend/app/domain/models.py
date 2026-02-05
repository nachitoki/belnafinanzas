from enum import Enum
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List

class Status(Enum):
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"

@dataclass
class Transaction:
    amount: float
    date: datetime
    category: str
    store_id: Optional[str] = None
    product_id: Optional[str] = None

@dataclass
class RecurringItem:
    label: str
    last_paid_date: datetime
    expected_interval_days: int

@dataclass
class ProductPrice:
    product_id: str
    unit_price: float
    date: datetime

@dataclass
class HouseholdSignals:
    spending: Status
    recurring: List[Status]
    products: List[Status]
