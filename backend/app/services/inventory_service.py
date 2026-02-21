from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from fastapi import HTTPException

from app.models.inventory import Inventory, InventoryMovement, MovementType
from app.models.product import Product
from app.schemas.inventory import StockAdjustment, InventoryUpdate, LowStockAlert
from app.core.redis import delete_cached, delete_pattern


class InventoryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[Inventory]:
        result = await self.db.execute(
            select(Inventory).options(selectinload(Inventory.product)).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def get_by_product(self, product_id: int) -> Optional[Inventory]:
        result = await self.db.execute(
            select(Inventory).options(selectinload(Inventory.movements))
            .where(Inventory.product_id == product_id)
        )
        return result.scalar_one_or_none()

    async def adjust_stock(self, product_id: int, data: StockAdjustment) -> Inventory:
        inventory = await self.get_by_product(product_id)
        if not inventory:
            raise HTTPException(status_code=404, detail="Inventory not found for this product")

        new_quantity = inventory.quantity + data.quantity
        if new_quantity < 0:
            raise HTTPException(status_code=400, detail="Adjustment would result in negative stock")

        inventory.quantity = new_quantity

        movement = InventoryMovement(
            inventory_id=inventory.id,
            movement_type=data.movement_type,
            quantity=abs(data.quantity),
            reference=data.reference,
            notes=data.notes,
        )
        self.db.add(movement)
        await self.db.flush()

        # Invalidate product cache
        await delete_cached(f"products:{product_id}")
        await delete_pattern("products:list:*")
        return inventory

    async def update_settings(self, product_id: int, data: InventoryUpdate) -> Inventory:
        inventory = await self.get_by_product(product_id)
        if not inventory:
            raise HTTPException(status_code=404, detail="Inventory not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(inventory, field, value)
        await self.db.flush()
        return inventory

    async def get_low_stock(self) -> List[LowStockAlert]:
        result = await self.db.execute(
            select(Inventory).options(selectinload(Inventory.product))
            .where(Inventory.quantity <= Inventory.reorder_point)
        )
        inventories = result.scalars().all()
        return [
            LowStockAlert(
                product_id=inv.product_id,
                product_name=inv.product.name,
                sku=inv.product.sku,
                current_stock=inv.quantity,
                reorder_point=inv.reorder_point,
            )
            for inv in inventories if inv.product
        ]

    async def get_movements(self, product_id: int, limit: int = 50) -> List[InventoryMovement]:
        inventory = await self.get_by_product(product_id)
        if not inventory:
            raise HTTPException(status_code=404, detail="Inventory not found")

        result = await self.db.execute(
            select(InventoryMovement)
            .where(InventoryMovement.inventory_id == inventory.id)
            .order_by(InventoryMovement.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()
