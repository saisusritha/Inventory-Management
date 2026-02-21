from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.inventory import (
    InventoryResponse, InventoryUpdate, StockAdjustment,
    InventoryMovementResponse, LowStockAlert
)
from app.services.inventory_service import InventoryService

router = APIRouter()


@router.get("/", response_model=List[InventoryResponse])
async def list_inventory(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = InventoryService(db)
    return await service.get_all(skip=skip, limit=limit)


@router.get("/low-stock", response_model=List[LowStockAlert])
async def get_low_stock_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = InventoryService(db)
    return await service.get_low_stock()


@router.get("/{product_id}", response_model=InventoryResponse)
async def get_inventory(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = InventoryService(db)
    from fastapi import HTTPException
    inventory = await service.get_by_product(product_id)
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")
    return inventory


@router.post("/{product_id}/adjust", response_model=InventoryResponse)
async def adjust_stock(
    product_id: int,
    data: StockAdjustment,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = InventoryService(db)
    return await service.adjust_stock(product_id, data)


@router.put("/{product_id}/settings", response_model=InventoryResponse)
async def update_inventory_settings(
    product_id: int,
    data: InventoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = InventoryService(db)
    return await service.update_settings(product_id, data)


@router.get("/{product_id}/movements", response_model=List[InventoryMovementResponse])
async def get_movements(
    product_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = InventoryService(db)
    return await service.get_movements(product_id, limit=limit)
