"""
MongoDB connection and collection access. All config from settings.
"""
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection

from app.config import get_settings

_client: Optional[AsyncIOMotorClient] = None


def get_collection() -> AsyncIOMotorCollection:
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncIOMotorClient(settings.mongodb_uri)
    settings = get_settings()
    return _client[settings.mongodb_db][settings.mongodb_collection]


async def close_mongo_client() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
