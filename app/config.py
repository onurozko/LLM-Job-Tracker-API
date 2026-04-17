"""
Application configuration loaded from environment / .env.
No hardcoded values; everything comes from settings.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "jobtracker"
    mongodb_collection: str = "applications"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # LLM
    llm_backend: str = "mock"
    ollama_base_url: str = "http://localhost:11434"

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = ""


def get_settings() -> Settings:
    return Settings()
