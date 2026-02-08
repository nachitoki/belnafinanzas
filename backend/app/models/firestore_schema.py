from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import Optional, Literal


class Household(BaseModel):
    """Household document schema"""
    name: str
    created_at: datetime = Field(default_factory=datetime.now)


class User(BaseModel):
    """User document schema"""
    household_id: str
    name: str
    role: Literal["admin", "member"]
    telegram_user_id: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.now)


class Account(BaseModel):
    """Account subcollection schema"""
    name: str
    type: Literal["cash", "bank", "credit_card", "utility", "family_debt"]
    currency: str = "CLP"
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)


class Category(BaseModel):
    """Category subcollection schema"""
    name: str
    kind: Literal["income", "expense"]
    essential: bool = False
    created_at: datetime = Field(default_factory=datetime.now)


class Transaction(BaseModel):
    """Transaction subcollection schema"""
    occurred_on: date
    amount: int  # positive = income, negative = expense (in cents or base unit)
    description: str
    category_id: Optional[str] = None
    account_id: str
    status: Literal["pending", "posted"]
    source: Literal["manual", "telegram", "receipt"]
    receipt_id: Optional[str] = None
    qty: Optional[float] = None
    unit: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)


class Store(BaseModel):
    """Store subcollection schema"""
    name: str  # This is the display_name
    legal_names: list[str] = []
    ruts: list[str] = []
    aliases: list[str] = []
    city: Optional[str] = None
    tags: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.now)


class Product(BaseModel):
    """Product subcollection schema"""
    name_raw: str
    name_norm: str
    unit_base: Literal["g", "ml", "unit", "kg", "l"]
    category: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)


class ProductPrice(BaseModel):
    """Product price flat collection schema (not subcollection for query flexibility)"""
    product_id: str
    store_id: str
    date: date
    qty: float
    unit: Literal["g", "ml", "unit", "kg", "l"]
    total_price: int  # in cents or base unit
    unit_price: float  # calculated: total_price / qty
    receipt_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)


class Receipt(BaseModel):
    """Receipt subcollection schema"""
    store_id: Optional[str] = None
    occurred_on: Optional[date] = None
    total: Optional[int] = None
    image_url: str
    status: Literal["uploaded", "extracted", "needs_review", "confirmed", "rejected"]
    extracted_json: Optional[dict] = None
    created_by: str  # user_id
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class ReceiptItem(BaseModel):
    """Receipt item subcollection schema (items under receipts)"""
    product_id: Optional[str] = None
    name_raw: str
    qty: Optional[float] = None
    unit: Optional[str] = None
    line_total: Optional[int] = None
    unit_price: Optional[float] = None
    confidence: float  # 0.0 to 1.0
    category_suggested: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)


class MealPlan(BaseModel):
    """Meal Plan subcollection schema (under households)"""
    date: str  # YYYY-MM-DD
    type: Literal["lunch", "dinner", "breakfast", "snack"] = "lunch"
    recipe_id: Optional[str] = None
    recipe_name: str
    recipe_cost: Optional[int] = 0
    updated_at: datetime = Field(default_factory=datetime.now)
