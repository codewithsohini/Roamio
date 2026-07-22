"""
app/ai/providers/granite.py
============================
IBM Granite / watsonx.ai implementation of AIProvider.

Uses direct REST calls to the watsonx.ai inference API, authenticated via
the IBM Cloud IAM token (fetched and cached using ibm-watsonx-ai's
Credentials helper, or via a plain httpx call as fallback).

Why not ModelInference from the SDK?
--------------------------------------
``ModelInference.__init__`` makes a preflight GET to
``/ml/v1/foundation_model_specs`` to validate the model ID. That call
requires the project to have a fully-linked WML service instance and returns
403 if that association is not yet set up — even though the actual inference
endpoints work fine. We bypass it entirely and call the inference REST
endpoints directly, which avoids the preflight and works in all account states.

Responsibilities
----------------
- Exchange the IBM Cloud API key for an IAM bearer token (cached until expiry).
- Call /ml/v1/text/generation_stream for streaming completions.
- Call /ml/v1/text/generation   for non-streaming completions.
- Raise typed AIProvider exceptions on auth failures, API errors, and timeouts.

This is the ONLY module that knows about IBM watsonx REST API internals.
All other modules depend on AIProvider (abstract) — not this class.
"""

from __future__ import annotations

import json
import logging
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

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# IBM IAM token endpoint (global — not per-region)
# ---------------------------------------------------------------------------
_IAM_TOKEN_URL = "https://iam.cloud.ibm.com/identity/token"

# Refresh the cached IAM token this many seconds before true expiry so we
# never use a token that expires mid-request.
_IAM_EXPIRY_BUFFER = 60


class GraniteService(AIProvider):
    """
    Calls IBM Granite via the watsonx.ai text generation REST API.

    IAM tokens are fetched lazily on the first request and cached until
    near-expiry. The same instance is shared for the lifetime of the process
    (factory singleton), so the token is refreshed only when necessary.
    """

    def __init__(self) -> None:
        self._iam_token: str | None = None
        self._iam_expires_at: float = 0.0  # monotonic timestamp

    # -----------------------------------------------------------------------
    # IAM token management
    # -----------------------------------------------------------------------

    async def _get_iam_token(self) -> str:
        """
        Returns a valid IBM IAM bearer token, refreshing when near-expiry.

        Raises:
            AIAuthError: If the IAM exchange fails for any reason.
        """
        now = time.monotonic()
        if self._iam_token and now < self._iam_expires_at:
            return self._iam_token

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
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

        if resp.status_code != 200:
            raise AIAuthError(
                f"IAM token exchange returned HTTP {resp.status_code}: "
                f"{resp.text[:300]}"
            )

        data = resp.json()
        self._iam_token = data["access_token"]
        expires_in: int = data.get("expires_in", 3600)
        self._iam_expires_at = now + expires_in - _IAM_EXPIRY_BUFFER
        return self._iam_token  # type: ignore[return-value]

    # -----------------------------------------------------------------------
    # Request helpers
    # -----------------------------------------------------------------------

    def _generation_url(self, stream: bool) -> str:
        base = settings.WATSONX_URL.rstrip("/")
        endpoint = "generation_stream" if stream else "generation"
        return f"{base}/ml/v1/text/{endpoint}?version=2023-05-29"

    def _build_payload(self, prompt: str, stream: bool) -> dict:
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

    def _auth_headers(self, token: str) -> dict:
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    # -----------------------------------------------------------------------
    # AIProvider — non-streaming
    # -----------------------------------------------------------------------

    async def complete(self, prompt: str) -> str:
        """
        Calls watsonx.ai /ml/v1/text/generation and returns the full text.

        Raises:
            AIAuthError:      On authentication / credential failure.
            AIRateLimitError: On HTTP 429 / quota exceeded.
            AITimeoutError:   On request timeout.
            AIProviderError:  For any other API error.
        """
        token = await self._get_iam_token()

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    self._generation_url(stream=False),
                    json=self._build_payload(prompt, stream=False),
                    headers=self._auth_headers(token),
                )
        except httpx.TimeoutException as exc:
            raise AITimeoutError("watsonx.ai completion request timed out.") from exc
        except httpx.RequestError as exc:
            raise AIProviderError(f"watsonx.ai request error: {exc}") from exc

        self._check_response_status(resp)

        data = resp.json()
        try:
            return data["results"][0]["generated_text"]
        except (KeyError, IndexError) as exc:
            raise AIProviderError(
                f"Unexpected watsonx.ai response shape: {str(data)[:300]}"
            ) from exc

    # -----------------------------------------------------------------------
    # AIProvider — streaming
    # -----------------------------------------------------------------------

    async def stream_completion(self, prompt: str) -> AsyncGenerator[str, None]:
        """
        Streams tokens from watsonx.ai /ml/v1/text/generation_stream.

        The endpoint returns newline-delimited SSE events. Each event body is
        a JSON object whose ``results[0].generated_text`` field carries the
        next token chunk.

        Yields:
            Text chunks as strings.

        Raises:
            AIAuthError:      On authentication / credential failure.
            AIRateLimitError: On HTTP 429 / quota exceeded.
            AITimeoutError:   On request timeout.
            AIProviderError:  For any other API error.
        """
        token = await self._get_iam_token()

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                async with client.stream(
                    "POST",
                    self._generation_url(stream=True),
                    json=self._build_payload(prompt, stream=True),
                    headers=self._auth_headers(token),
                ) as resp:
                    # For non-200 we must aread() the body before accessing it —
                    # .text / .json() are forbidden on an unread streaming response.
                    if resp.status_code != 200:
                        await resp.aread()
                        self._check_status_from_read_response(resp)

                    async for line in resp.aiter_lines():
                        line = line.strip()
                        if not line or not line.startswith("data:"):
                            continue
                        json_str = line[len("data:"):].strip()
                        if json_str == "[DONE]":
                            break
                        try:
                            chunk = json.loads(json_str)
                            text_piece = (
                                chunk.get("results", [{}])[0]
                                .get("generated_text", "")
                            )
                            if text_piece:
                                yield text_piece
                        except (json.JSONDecodeError, IndexError):
                            # Malformed chunk — skip silently
                            continue

            except httpx.TimeoutException as exc:
                raise AITimeoutError(
                    "watsonx.ai streaming request timed out."
                ) from exc
            except httpx.RequestError as exc:
                raise AIProviderError(
                    f"watsonx.ai request error: {exc}"
                ) from exc

    # -----------------------------------------------------------------------
    # Shared helpers
    # -----------------------------------------------------------------------

    def _check_response_status(self, resp: httpx.Response) -> None:
        """
        Check status on a *fully-received* (non-streaming) response.

        Safe to call after ``await client.post(...)`` because the body has
        already been buffered. Do NOT call this on a response obtained via
        ``client.stream()`` — use ``_check_status_from_read_response`` there
        after calling ``await resp.aread()`` first.
        """
        if resp.status_code == 200:
            return
        self._check_status_from_read_response(resp)

    def _check_status_from_read_response(self, resp: httpx.Response) -> None:
        """
        Raise the appropriate typed exception for non-200 responses whose body
        has already been read (either a normal response, or a streaming response
        after ``await resp.aread()``).
        """
        if resp.status_code == 200:
            return
        # .text is safe here — body is guaranteed to be buffered by the caller.
        body_preview = resp.text[:300]
        if resp.status_code == 401:
            raise AIAuthError("watsonx.ai returned 401 Unauthorized.")
        if resp.status_code == 403:
            raise AIAuthError(
                f"watsonx.ai returned 403 Forbidden. "
                f"Verify your API key and Project ID are correct. "
                f"Body: {body_preview}"
            )
        if resp.status_code == 429:
            raise AIRateLimitError("watsonx.ai rate limit exceeded (429).")
        raise AIProviderError(
            f"watsonx.ai returned HTTP {resp.status_code}: {body_preview}"
        )
