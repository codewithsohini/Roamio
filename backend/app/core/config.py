"""
app/core/config.py
==================
Centralised, environment-driven configuration for the Roamio backend.

All settings are loaded exclusively from environment variables (or a .env
file at startup via python-dotenv). Nothing is hard-coded here — this module
only declares types, defaults, and validation rules.

Usage anywhere in the codebase:
    from app.core.config import settings
    print(settings.DATABASE_URL)
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application-wide settings loaded from environment variables.

    Required variables with no default will raise a clear ValidationError
    at startup if they are missing from the environment — preventing the
    application from starting in a misconfigured state.
    """

    model_config = SettingsConfigDict(
        # Read from a .env file if present; silently skip if not found.
        env_file=".env",
        env_file_encoding="utf-8",
        # Ignore any extra env vars that are not declared here.
        extra="ignore",
        # Make the settings object immutable after construction.
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
    # Full PostgreSQL DSN.
    # Example: postgresql://roamio_user:pass@localhost:5432/roamio_db
    DATABASE_URL: PostgresDsn = Field(
        ...,
        description="PostgreSQL connection string. Required.",
    )

    # SQLAlchemy connection pool settings.
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30   # seconds before giving up on a connection
    DB_ECHO: bool = False        # set True to log all SQL statements (dev only)

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
    # AI Provider
    # -------------------------------------------------------------------------
    # Which LLM provider to use. The factory (app/ai/factory.py) reads this
    # value and returns the matching AIProvider implementation.
    AI_PROVIDER: Literal["granite"] = "granite"

    # -------------------------------------------------------------------------
    # IBM watsonx.ai / Granite
    # -------------------------------------------------------------------------
    WATSONX_API_KEY: str = Field(
        ...,
        description="IBM Cloud API key for watsonx.ai authentication. Required.",
    )
    WATSONX_PROJECT_ID: str = Field(
        ...,
        description="watsonx.ai project ID. Required.",
    )
    WATSONX_URL: str = "https://us-south.ml.cloud.ibm.com"
    WATSONX_MODEL_ID: str = "ibm/granite-13b-chat-v2"
    WATSONX_MAX_TOKENS: int = Field(default=4096, ge=1, le=8192)
    WATSONX_TEMPERATURE: float = Field(default=0.7, ge=0.0, le=1.0)

    # -------------------------------------------------------------------------
    # Future AI providers (not yet active — extend AI_PROVIDER Literal and
    # app/ai/factory.py when adding a new provider).
    # -------------------------------------------------------------------------
    # OPENAI_API_KEY: str | None = None
    # ANTHROPIC_API_KEY: str | None = None

    # -------------------------------------------------------------------------
    # Validators
    # -------------------------------------------------------------------------
    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_not_be_placeholder(cls, v: str) -> str:
        """Prevent the app from starting with the example placeholder value."""
        if v == "your-very-secret-key-replace-this":
            raise ValueError(
                "SECRET_KEY is still set to the placeholder value from .env.example. "
                "Generate a real key with: openssl rand -hex 32"
            )
        return v

    @field_validator("APP_ENV")
    @classmethod
    def warn_debug_in_production(cls, v: str) -> str:
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Returns the singleton Settings instance.

    Decorated with lru_cache so the .env file is read exactly once per
    process lifetime — not on every import or request.
    """
    return Settings()


# ---------------------------------------------------------------------------
# Module-level singleton — import this directly throughout the codebase.
# ---------------------------------------------------------------------------
settings: Settings = get_settings()
