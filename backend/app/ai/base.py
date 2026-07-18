"""
app/ai/base.py
==============
Abstract AIProvider interface.

All business logic (RecommendationService, etc.) depends ONLY on this
interface — never on a concrete provider class. This makes the entire
AI layer swappable by changing one config value.

Contract
--------
- stream_completion(prompt) → AsyncGenerator[str, None]
    Streams the model response token-by-token. Callers consume this
    generator to build an SSE stream toward the client.

- complete(prompt) → str
    Returns the full response in one call (non-streaming). Used by
    ResponseValidator for the repair flow and any non-streaming path.

Adding a new provider
---------------------
1. Create app/ai/providers/<name>.py implementing AIProvider.
2. Add a new Literal value to settings.AI_PROVIDER.
3. Add the mapping in app/ai/factory.py.
Zero other changes required.
"""

from abc import ABC, abstractmethod
from typing import AsyncGenerator


class AIProvider(ABC):
    """
    Abstract base class for all LLM provider implementations.

    Concrete subclasses must implement both `stream_completion` and
    `complete`. The rest of the application only ever types against
    this interface.
    """

    @abstractmethod
    async def stream_completion(self, prompt: str) -> AsyncGenerator[str, None]:
        """
        Call the model and yield response tokens as they arrive.

        Args:
            prompt: The fully-assembled prompt string to send to the model.

        Yields:
            Individual text tokens/chunks as strings.

        Raises:
            AIProviderError: On authentication failure, API error, or timeout.
        """
        # This makes the method a proper async generator in the abstract class.
        # Concrete implementations must use `yield` somewhere.
        raise NotImplementedError  # pragma: no cover
        yield  # noqa: unreachable — makes return type AsyncGenerator

    @abstractmethod
    async def complete(self, prompt: str) -> str:
        """
        Call the model and return the full response as a single string.

        Used by ResponseValidator for the JSON repair flow and any
        code path that does not need streaming.

        Args:
            prompt: The fully-assembled prompt string to send to the model.

        Returns:
            The full model response as a string.

        Raises:
            AIProviderError: On authentication failure, API error, or timeout.
        """
        raise NotImplementedError  # pragma: no cover


# ---------------------------------------------------------------------------
# Typed exceptions — providers raise these; callers catch them.
# ---------------------------------------------------------------------------

class AIProviderError(Exception):
    """Base exception for all AI provider errors."""


class AIAuthError(AIProviderError):
    """Raised when IAM / API authentication fails."""


class AIRateLimitError(AIProviderError):
    """Raised when the provider returns a rate-limit response (429)."""


class AITimeoutError(AIProviderError):
    """Raised when the provider does not respond within the allowed time."""