"""
app/ai/providers/granite.py
============================
IBM Granite / watsonx.ai implementation of AIProvider.

Responsibilities
----------------
- Exchange the IBM Cloud API key for an IAM bearer token (cached until expiry).
- Call /ml/v1/text/generation_stream for streaming completions.
- Call /ml/v1/text/generation for non-streaming completions.
- Raise typed AIProvider exceptions on auth failures, API errors, and timeouts.

This is the ONLY module that knows about:
  - IBM IAM token endpoints
  - watsonx.ai REST payload format
  - IBM-specific error codes

All other modules depend on AIProvider (abstract) — not this class.
"""

from __future__ import annotations

import json
import time
from typing import AsyncGenerator

import httpx

from app.ai.base import (
    AIAuthError,
    AIProvider,
    AIProviderError,
    AIRateLimitError,
    AITimeoutError,
)
from app.core.config import settings

# ---------------------------------------------------------------------------
# IBM IAM token endpoint (global — not per-region)
# ---------------------------------------------------------------------------
_IAM_TOKEN_URL = "https://iam.cloud.ibm.com/identity/token"

# Refresh the IAM token this many seconds before it truly expires to avoid
# using a token that expires mid-request.
_IAM_TOKEN_EXPIRY_BUFFER_SECONDS = 60


class GraniteService(AIProvider):
    """
    Calls IBM Granite via the watsonx.ai REST API.

    IAM tokens are fetched lazily on the first request and cached in
    instance variables until they near expiry. The same instance is
    shared for the lifetime of the process (via the factory singleton),
    so the token is only refreshed when necessary.
    """

    def __init__(self) -> None:
        self._iam_token: str | None = None
        self._iam_token_expires_at: float = 0.0  # Unix timestamp

    # -----------------------------------------------------------------------
    # IAM authentication
    # -----------------------------------------------------------------------

    async def _get_iam_token(self) -> str:
        """
        Returns a valid IBM IAM bearer token, refreshing it if necessary.

        The token is cached in `self._iam_token` until
        `_iam_token_expires_at - _IAM_TOKEN_EXPIRY_BUFFER_SECONDS`.

        Raises:
            AIAuthError: If the IAM exchange fails for any reason.
        """
        now = time.monotonic()
        # Return cached token if still valid with buffer
        if self._iam_token and now < self._iam_token_expires_at:
            return self._iam_token

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    _IAM_TOKEN_URL,
                    data={
                        "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
                        "apikey": settings.WATSONX_API_KEY,
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
        except httpx.TimeoutException as exc:
            raise AIAuthError("IAM token request timed out.") from exc
        except httpx.RequestError as exc:
            raise AIAuthError(f"IAM token request failed: {exc}") from exc

        if response.status_code != 200:
            raise AIAuthError(
                f"IAM token exchange returned HTTP {response.status_code}: "
                f"{response.text[:200]}"
            )

        data = response.json()
        self._iam_token = data["access_token"]
        # expires_in is the TTL in seconds from now
        expires_in: int = data.get("expires_in", 3600)
        self._iam_token_expires_at = (
            time.monotonic() + expires_in - _IAM_TOKEN_EXPIRY_BUFFER_SECONDS
        )
        return self._iam_token  # type: ignore[return-value]

    # -----------------------------------------------------------------------
    # Shared payload builder
    # -----------------------------------------------------------------------

    def _build_payload(self, prompt: str, stream: bool) -> dict:
        """Builds the watsonx.ai generation request payload."""
        return {
            "model_id": settings.WATSONX_MODEL_ID,
            "input": prompt,
            "parameters": {
                "decoding_method": "greedy",
                "max_new_tokens": settings.WATSONX_MAX_TOKENS,
                "temperature": settings.WATSONX_TEMPERATURE,
                "stream": stream,
            },
            "project_id": settings.WATSONX_PROJECT_ID,
        }

    def _generation_url(self, stream: bool) -> str:
        base = settings.WATSONX_URL.rstrip("/")
        endpoint = "generation_stream" if stream else "generation"
        return f"{base}/ml/v1/text/{endpoint}?version=2023-05-29"

    def _auth_headers(self, token: str) -> dict:
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    # -----------------------------------------------------------------------
    # AIProvider — streaming
    # -----------------------------------------------------------------------

    async def stream_completion(self, prompt: str) -> AsyncGenerator[str, None]:
        """
        Streams tokens from watsonx.ai /ml/v1/text/generation_stream.

        The endpoint returns newline-delimited JSON objects, each prefixed
        with "data: ". Each object contains a `results[0].generated_text`
        field with the next token chunk.

        Yields:
            Text chunks as strings.

        Raises:
            AIAuthError:      If the IAM exchange fails.
            AIRateLimitError: If the API returns 429.
            AITimeoutError:   If the request times out.
            AIProviderError:  For any other API-level error.
        """
        token = await self._get_iam_token()
        payload = self._build_payload(prompt, stream=True)

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    self._generation_url(stream=True),
                    json=payload,
                    headers=self._auth_headers(token),
                ) as response:
                    if response.status_code == 401:
                        raise AIAuthError("watsonx.ai returned 401 Unauthorized.")
                    if response.status_code == 429:
                        raise AIRateLimitError("watsonx.ai rate limit exceeded (429).")
                    if response.status_code != 200:
                        body = await response.aread()
                        raise AIProviderError(
                            f"watsonx.ai stream returned HTTP {response.status_code}: "
                            f"{body[:200].decode('utf-8', errors='replace')}"
                        )

                    async for line in response.aiter_lines():
                        line = line.strip()
                        if not line or not line.startswith("data:"):
                            continue
                        json_str = line[len("data:"):].strip()
                        if json_str == "[DONE]":
                            break
                        try:
                            chunk = json.loads(json_str)
                            text_piece = (
                                chunk.get("results", [{}])[0].get("generated_text", "")
                            )
                            if text_piece:
                                yield text_piece
                        except (json.JSONDecodeError, IndexError):
                            # Malformed chunk — skip silently, don't break the stream
                            continue

        except httpx.TimeoutException as exc:
            raise AITimeoutError("watsonx.ai streaming request timed out.") from exc
        except httpx.RequestError as exc:
            raise AIProviderError(f"watsonx.ai request error: {exc}") from exc

    # -----------------------------------------------------------------------
    # AIProvider — non-streaming
    # -----------------------------------------------------------------------

    async def complete(self, prompt: str) -> str:
        """
        Calls watsonx.ai /ml/v1/text/generation and returns the full text.

        Used by ResponseValidator for the JSON repair flow.

        Raises:
            AIAuthError:      If the IAM exchange fails.
            AIRateLimitError: If the API returns 429.
            AITimeoutError:   If the request times out.
            AIProviderError:  For any other API-level error.
        """
        token = await self._get_iam_token()
        payload = self._build_payload(prompt, stream=False)

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self._generation_url(stream=False),
                    json=payload,
                    headers=self._auth_headers(token),
                )
        except httpx.TimeoutException as exc:
            raise AITimeoutError("watsonx.ai completion request timed out.") from exc
        except httpx.RequestError as exc:
            raise AIProviderError(f"watsonx.ai request error: {exc}") from exc

        if response.status_code == 401:
            raise AIAuthError("watsonx.ai returned 401 Unauthorized.")
        if response.status_code == 429:
            raise AIRateLimitError("watsonx.ai rate limit exceeded (429).")
        if response.status_code != 200:
            raise AIProviderError(
                f"watsonx.ai completion returned HTTP {response.status_code}: "
                f"{response.text[:200]}"
            )

        data = response.json()
        try:
            return data["results"][0]["generated_text"]
        except (KeyError, IndexError) as exc:
            raise AIProviderError(
                f"Unexpected watsonx.ai response shape: {str(data)[:200]}"
            ) from exc
