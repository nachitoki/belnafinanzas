from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date


# --- Request/Response Schemas ---

class ReceiptUploadResponse(BaseModel):
    """Response after uploading a receipt"""
    receipt_id: str
    status: str
    image_url: str
    merchant: Optional[str] = None
    total: Optional[int] = None
    date: Optional[str] = None
    items: List['ReceiptItemDetail'] = Field(default_factory=list)



class ReceiptItemDetail(BaseModel):
    """Individual receipt item details"""
    id: str
    name_raw: str
    qty: Optional[float] = None
    unit: Optional[str] = None
    line_total: Optional[int] = None
    unit_price: Optional[float] = None
    confidence: float
    product_id: Optional[str] = None


class ReceiptDetail(BaseModel):
    """Full receipt details with items"""
    id: str
    status: str
    image_url: str
    store_name: Optional[str] = None
    store_id: Optional[str] = None
    date: Optional[str] = None  # Changed from date to str to match actual data format
    total: Optional[int] = None
    confidence: Optional[float] = None
    items: List[ReceiptItemDetail] = Field(default_factory=list)
    created_at: str
    updated_at: str



class ReceiptItemEdit(BaseModel):
    """Item structure for editing"""
    id: Optional[str] = None # New items won't have ID
    name_raw: str
    name_clean: Optional[str] = None
    name_brand: Optional[str] = None
    qty: float = 1.0
    unit_price: float = 0.0
    line_total: float = 0.0

class ReceiptConfirmRequest(BaseModel):
    """User corrections when confirming a receipt"""
    store_name: str
    date: str  # Changed from date to str for consistency
    total: float
    category_id: Optional[str] = None
    items: Optional[List[ReceiptItemEdit]] = None



class ReceiptConfirmResponse(BaseModel):
    """Response after confirming a receipt"""
    transaction_id: str
    products_linked: int
    products_created: int
    prices_created: int
