from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    price: float = Field(..., gt=0)
    category: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True


class ProductCreate(ProductBase):
    initial_stock: int = Field(default=0, ge=0)
    reorder_point: int = Field(default=10, ge=0)


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    category: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProductWithInventory(ProductResponse):
    stock_quantity: Optional[int] = None
    available_quantity: Optional[int] = None
    is_low_stock: Optional[bool] = None
