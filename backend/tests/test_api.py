import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_list_products_unauthenticated():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/products/")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_register_and_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register
        reg_response = await client.post("/api/v1/users/register", json={
            "email": "test@example.com",
            "username": "testuser",
            "password": "TestPass123",
            "full_name": "Test User",
        })
        assert reg_response.status_code == 201

        # Login
        login_response = await client.post(
            "/api/v1/users/login",
            data={"username": "testuser", "password": "TestPass123"},
        )
        assert login_response.status_code == 200
        assert "access_token" in login_response.json()
