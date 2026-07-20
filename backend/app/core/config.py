"""
app/core/config.py
==================
Centralised, environment-driven configuration for the Roamio backend.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        frozen=True,
    )

    # -------------------------------------------------------------------------
    # Application
    # -------------------------------------------------------------------------
    APP_NAME: str = "Roamio API"
    APP_VERSION: str = "1.0.0"
    APP_ENV: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = False

    # -------------------------------------------------------------------------
    # Database
    # -------------------------------------------------------------------------
    DATABASE_URL: str = Field(
        ...,
        description="PostgreSQL connection string. Required.",
    )

    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_ECHO: bool = False

    # -------------------------------------------------------------------------
    # Authentication (JWT)
    # -------------------------------------------------------------------------
    SECRET_KEY: str = Field(
        ...,
        min_length=32,
        description="Secret key for signing JWT tokens. Required. Min 32 chars.",
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # -------------------------------------------------------------------------
    # CORS
    # -------------------------------------------------------------------------
    # Comma-separated list of allowed origins for production.
    # Example: "https://myapp.onrender.com,https://www.myapp.com"
    ALLOWED_ORIGINS: str = ""

    # -------------------------------------------------------------------------
    # AI Provider
    # -------------------------------------------------------------------------
    AI_PROVIDER: Literal["groq"] = "groq"

    GROQ_API_KEY: str = Field(
        ...,
        description="Groq API key",
    )
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # -------------------------------------------------------------------------
    # Validators
    # -------------------------------------------------------------------------
    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_not_be_placeholder(cls, v: str) -> str:
        if v == "your-very-secret-key-replace-this":
            raise ValueError(
                "SECRET_KEY is still set to the placeholder value from .env.example. "
                "Generate a real key with: openssl rand -hex 32"
            )
        return v

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def fix_postgres_scheme(cls, v: str) -> str:
        """
        Replit sometimes provides DATABASE_URL with the 'postgres://' scheme.
        SQLAlchemy requires 'postgresql://'. Normalize it here.
        """
        if isinstance(v, str) and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings: Settings = get_settings()
