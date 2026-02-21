from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductWithInventory
from app.services.product_service import ProductService

router = APIRouter()


@router.get("/", response_model=List[ProductWithInventory])
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    service = ProductService(db)
    return await service.get_all(skip=skip, limit=limit, category=category)


@router.get("/categories", response_model=List[str])
async def list_categories(db: AsyncSession = Depends(get_db)):
    service = ProductService(db)
    return await service.get_categories()


@router.get("/{product_id}", response_model=ProductWithInventory)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    service = ProductService(db)
    product = await service.get_by_id(product_id)
    if not product:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("/", response_model=ProductResponse, status_code=201)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProductService(db)
    return await service.create(data)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProductService(db)
    return await service.update(product_id, data)


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProductService(db)
    await service.delete(product_id)
