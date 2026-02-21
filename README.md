# Inventory & Order Management System

A full-stack inventory and order management system built with **FastAPI**, **React (TypeScript)**, **PostgreSQL**, and **Redis**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy (async), Alembic |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT (python-jose + passlib/bcrypt) |
| DevOps | Docker, Docker Compose |

---

## Architecture

```
inventory-management/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/     # Route handlers (products, orders, users, inventory)
│   │   ├── core/              # Config, DB, Redis, Security
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   ├── services/          # Business logic layer
│   │   └── main.py
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route-level page components
│   │   ├── services/          # API client (axios)
│   │   ├── store/             # Zustand state management
│   │   └── types/             # TypeScript interfaces
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Features

- **Product Management** — Full CRUD with SKU tracking, categories, and image URLs
- **Order Management** — Create orders with stock reservation, status flow (pending → delivered), cancellation with stock release
- **Inventory Tracking** — Real-time stock levels, reserved quantities, movement history, low-stock alerts
- **User Auth** — JWT authentication, role-based access (admin / manager / viewer)
- **Redis Caching** — Product list and detail endpoints cached with auto-invalidation on mutations
- **Dashboard** — Charts for category distribution, order status breakdown, low-stock alerts

---

## Quick Start (Docker)

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/inventory-management.git
cd inventory-management

# 2. Copy and configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your values

# 3. Start all services
docker-compose up --build

# 4. Open the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

---

## Local Development (Without Docker)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Update POSTGRES_HOST, REDIS_HOST, SECRET_KEY

# Start the server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies /api → localhost:8000)
npm run dev
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/users/register` | Register new user |
| POST | `/api/v1/users/login` | Get JWT token |
| GET | `/api/v1/users/me` | Get current user |

### Products
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/products/` | List all products (cached) |
| GET | `/api/v1/products/{id}` | Get product (cached) |
| POST | `/api/v1/products/` | Create product + inventory |
| PUT | `/api/v1/products/{id}` | Update product |
| DELETE | `/api/v1/products/{id}` | Delete product |

### Orders
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/orders/` | List orders |
| POST | `/api/v1/orders/` | Create order (reserves stock) |
| PATCH | `/api/v1/orders/{id}` | Update status |
| DELETE | `/api/v1/orders/{id}` | Delete pending/cancelled order |

### Inventory
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/inventory/` | List all inventory |
| GET | `/api/v1/inventory/low-stock` | Get low stock alerts |
| POST | `/api/v1/inventory/{product_id}/adjust` | Adjust stock |
| GET | `/api/v1/inventory/{product_id}/movements` | Movement history |

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```
---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_HOST` | `localhost` | PostgreSQL host |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_USER` | `postgres` | PostgreSQL user |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL password |
| `POSTGRES_DB` | `inventory_db` | Database name |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `SECRET_KEY` | — | JWT signing secret **(change in prod!)** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | JWT expiration |
| `CACHE_TTL` | `300` | Redis cache TTL in seconds |
