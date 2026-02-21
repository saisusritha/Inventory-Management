import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional, List
from fastapi import HTTPException, status

from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.inventory import Inventory, InventoryMovement, MovementType
from app.schemas.order import OrderCreate, OrderUpdate


class OrderService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, skip: int = 0, limit: int = 100, user_id: Optional[int] = None) -> List[Order]:
        query = select(Order).options(selectinload(Order.items))
        if user_id:
            query = query.where(Order.user_id == user_id)
        query = query.order_by(Order.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_id(self, order_id: int) -> Optional[Order]:
        result = await self.db.execute(
            select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
        )
        return result.scalar_one_or_none()

    async def create(self, data: OrderCreate, user_id: Optional[int] = None) -> Order:
        order_number = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        order = Order(
            order_number=order_number,
            user_id=user_id,
            status=OrderStatus.PENDING,
            shipping_address=data.shipping_address,
            notes=data.notes,
        )
        self.db.add(order)
        await self.db.flush()

        total = 0.0
        for item_data in data.items:
            # Get product and check availability
            product_result = await self.db.execute(
                select(Product).options(selectinload(Product.inventory)).where(Product.id == item_data.product_id)
            )
            product = product_result.scalar_one_or_none()
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item_data.product_id} not found")
            if not product.is_active:
                raise HTTPException(status_code=400, detail=f"Product {product.name} is not available")
            if not product.inventory or product.inventory.available_quantity < item_data.quantity:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")

            subtotal = product.price * item_data.quantity
            total += subtotal

            order_item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=item_data.quantity,
                unit_price=product.price,
                subtotal=subtotal,
            )
            self.db.add(order_item)

            # Reserve inventory
            product.inventory.reserved_quantity += item_data.quantity
            movement = InventoryMovement(
                inventory_id=product.inventory.id,
                movement_type=MovementType.OUT,
                quantity=item_data.quantity,
                reference=order_number,
                notes=f"Reserved for order {order_number}",
            )
            self.db.add(movement)

        order.total_amount = total
        await self.db.flush()
        return order

    async def update_status(self, order_id: int, data: OrderUpdate) -> Order:
        order = await self.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        if data.status:
            # Handle cancellation - release reserved stock
            if data.status == OrderStatus.CANCELLED and order.status != OrderStatus.CANCELLED:
                await self._release_reserved_stock(order)
            order.status = data.status

        if data.shipping_address is not None:
            order.shipping_address = data.shipping_address
        if data.notes is not None:
            order.notes = data.notes

        await self.db.flush()
        return order

    async def _release_reserved_stock(self, order: Order):
        result = await self.db.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        )
        items = result.scalars().all()
        for item in items:
            inv_result = await self.db.execute(
                select(Inventory).where(Inventory.product_id == item.product_id)
            )
            inventory = inv_result.scalar_one_or_none()
            if inventory:
                inventory.reserved_quantity = max(0, inventory.reserved_quantity - item.quantity)
                movement = InventoryMovement(
                    inventory_id=inventory.id,
                    movement_type=MovementType.IN,
                    quantity=item.quantity,
                    reference=order.order_number,
                    notes=f"Released from cancelled order {order.order_number}",
                )
                self.db.add(movement)

    async def delete(self, order_id: int) -> bool:
        order = await self.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.status not in [OrderStatus.PENDING, OrderStatus.CANCELLED]:
            raise HTTPException(status_code=400, detail="Can only delete pending or cancelled orders")
        await self.db.delete(order)
        return True
