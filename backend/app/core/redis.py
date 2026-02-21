import redis.asyncio as redis
import json
from typing import Any, Optional
from app.core.config import settings

redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True,
)


async def get_cached(key: str) -> Optional[Any]:
    data = await redis_client.get(key)
    if data:
        return json.loads(data)
    return None


async def set_cached(key: str, value: Any, ttl: int = settings.CACHE_TTL):
    await redis_client.setex(key, ttl, json.dumps(value))


async def delete_cached(key: str):
    await redis_client.delete(key)


async def delete_pattern(pattern: str):
    keys = await redis_client.keys(pattern)
    if keys:
        await redis_client.delete(*keys)
