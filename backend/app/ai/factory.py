"""
app/ai/factory.py
=================
AI provider factory — resolves the active provider from configuration.

The rest of the application calls `get_ai_provider()` exactly once per
process (it is cached) and receives an `AIProvider` instance. No caller
ever imports a concrete provider class directly.

Adding a new provider
---------------------
1. Create app/ai/providers/<name>.py implementing AIProvider.
2. Add the new value to the AI_PROVIDER Literal in app/core/config.py.
3. Add the mapping entry to _PROVIDER_MAP below.
That is all — no other file needs to change.
"""

from functools import lru_cache
from app.ai.base import AIProvider
from app.core.config import settings


@lru_cache(maxsize=1)
def get_ai_provider() -> AIProvider:
    """
    Returns the singleton AIProvider instance for the configured provider.

    The instance is created lazily on the first call and reused for the
    lifetime of the process. Thread-safe via lru_cache.

    Raises:
        ValueError: If settings.AI_PROVIDER names an unknown provider.
                    This is a programmer error caught at startup, not a
                    runtime error.
    """
    # Import here to keep provider modules out of the module-level import
    # graph — they are only loaded when actually needed.
    from app.ai.providers.groq import GroqService

    _PROVIDER_MAP = {
        "groq": GroqService,
    }

    provider_key = settings.AI_PROVIDER
    provider_class = _PROVIDER_MAP.get(provider_key)

    if provider_class is None:
        raise ValueError(
            f"Unknown AI_PROVIDER '{provider_key}'. "
            f"Valid values: {list(_PROVIDER_MAP.keys())}"
        )

    return provider_class()