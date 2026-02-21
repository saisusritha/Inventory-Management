from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional, List
from fastapi import HTTPException, status

from app.models.product import Product
from app.models.inventory import Inventory, InventoryMovement, MovementType
from app.schemas.product import ProductCreate, ProductUpdate, ProductWithInventory
from app.core.redis import get_cached, set_cached, delete_cached, delete_pattern


class ProductService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, skip: int = 0, limit: int = 100, category: Optional[str] = None) -> List[Product]:
        cache_key = f"products:list:{skip}:{limit}:{category}"
        cached = await get_cached(cache_key)
        if cached:
            return cached

        query = select(Product).options(selectinload(Product.inventory))
        if category:
            query = query.where(Product.category == category)
        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        products = result.scalars().all()

        data = [self._to_dict_with_inventory(p) for p in products]
        await set_cached(cache_key, data)
        return products

    async def get_by_id(self, product_id: int) -> Optional[Product]:
        cache_key = f"products:{product_id}"
        cached = await get_cached(cache_key)
        if cached:
            return cached

        result = await self.db.execute(
            select(Product).options(selectinload(Product.inventory)).where(Product.id == product_id)
        )
        product = result.scalar_one_or_none()
        if product:
            await set_cached(cache_key, self._to_dict_with_inventory(product))
        return product

    async def create(self, data: ProductCreate) -> Product:
        # Check SKU uniqueness
        existing = await self.db.execute(select(Product).where(Product.sku == data.sku))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SKU already exists")

        product = Product(
            name=data.name, sku=data.sku, description=data.description,
            price=data.price, category=data.category, image_url=data.image_url,
            is_active=data.is_active,
        )
        self.db.add(product)
        await self.db.flush()

        # Create inventory record
        inventory = Inventory(
            product_id=product.id,
            quantity=data.initial_stock,
            reorder_point=data.reorder_point,
        )
        self.db.add(inventory)

        if data.initial_stock > 0:
            movement = InventoryMovement(
                inventory_id=inventory.id,
                movement_type=MovementType.IN,
                quantity=data.initial_stock,
                notes="Initial stock",
            )
            self.db.add(movement)

        await self.db.flush()
        await delete_pattern("products:list:*")
        return product

    async def update(self, product_id: int, data: ProductUpdate) -> Product:
        product = await self.get_by_id(product_id)
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(product, field, value)

        await self.db.flush()
        await delete_cached(f"products:{product_id}")
        await delete_pattern("products:list:*")
        return product

    async def delete(self, product_id: int) -> bool:
        product = await self.get_by_id(product_id)
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        await self.db.delete(product)
        await delete_cached(f"products:{product_id}")
        await delete_pattern("products:list:*")
        return True

    async def get_categories(self) -> List[str]:
        cache_key = "products:categories"
        cached = await get_cached(cache_key)
        if cached:
            return cached

        result = await self.db.execute(
            select(Product.category).distinct().where(Product.category.isnot(None))
        )
        categories = [row[0] for row in result.all()]
        await set_cached(cache_key, categories)
        return categories

    def _to_dict_with_inventory(self, product: Product) -> dict:
        d = {c.name: getattr(product, c.name) for c in product.__table__.columns}
        if product.inventory:
            d["stock_quantity"] = product.inventory.quantity
            d["available_quantity"] = product.inventory.available_quantity
            d["is_low_stock"] = product.inventory.quantity <= product.inventory.reorder_point
        return d
