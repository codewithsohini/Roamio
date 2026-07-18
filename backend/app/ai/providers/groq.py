from __future__ import annotations

from typing import AsyncGenerator

from groq import AsyncGroq

from app.ai.base import (
    AIAuthError,
    AIProvider,
    AIProviderError,
    AIRateLimitError,
    AITimeoutError,
)
from app.core.config import settings


class GroqService(AIProvider):
    """
    Groq implementation of AIProvider.

    Uses the official Groq SDK.
    """

    def __init__(self) -> None:
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    async def complete(self, prompt: str) -> str:
        """
        Return the full model response.
        """
        try:
            response = await self.client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                temperature=0.7,
            )

            return response.choices[0].message.content or ""

        except Exception as exc:
            self._handle_exception(exc)

    async def stream_completion(
        self,
        prompt: str,
    ) -> AsyncGenerator[str, None]:
        """
        Stream tokens from Groq.
        """

        try:
            stream = await self.client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                temperature=0.7,
                stream=True,
            )

            async for chunk in stream:
                if (
                    chunk.choices
                    and chunk.choices[0].delta
                    and chunk.choices[0].delta.content
                ):
                    yield chunk.choices[0].delta.content

        except Exception as exc:
            self._handle_exception(exc)

    def _handle_exception(self, exc: Exception):
        """
        Convert Groq SDK exceptions into your project's exceptions.
        """

        message = str(exc).lower()

        if "401" in message or "authentication" in message:
            raise AIAuthError(str(exc)) from exc

        if "429" in message or "rate limit" in message:
            raise AIRateLimitError(str(exc)) from exc

        if "timeout" in message:
            raise AITimeoutError(str(exc)) from exc

        raise AIProviderError(str(exc)) from exc