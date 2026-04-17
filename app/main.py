"""
FastAPI app: routes, lifespan (MongoDB), CORS. Config from settings.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import close_mongo_client, get_collection
from app.routes import applications, tasks


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure DB client is initialized
    get_collection()
    yield
    await close_mongo_client()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="LLM Job Tracker API", lifespan=lifespan)

    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    if origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(applications.router)
    app.include_router(tasks.router)
    return app


app = create_app()
