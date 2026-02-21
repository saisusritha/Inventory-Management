from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.inventory import MovementType


class InventoryResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    reserved_quantity: int
    available_quantity: int
    reorder_point: int
    reorder_quantity: int
    updated_at: datetime

    class Config:
        from_attributes = True


class InventoryUpdate(BaseModel):
    reorder_point: Optional[int] = Field(None, ge=0)
    reorder_quantity: Optional[int] = Field(None, ge=0)


class StockAdjustment(BaseModel):
    quantity: int = Field(..., description="Positive to add, negative to subtract")
    movement_type: MovementType
    reference: Optional[str] = None
    notes: Optional[str] = None


class InventoryMovementResponse(BaseModel):
    id: int
    inventory_id: int
    movement_type: MovementType
    quantity: int
    reference: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class LowStockAlert(BaseModel):
    product_id: int
    product_name: str
    sku: str
    current_stock: int
    reorder_point: int
