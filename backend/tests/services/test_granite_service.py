"""
tests/services/test_granite_service.py
=======================================
Unit tests for GraniteService, the IBM watsonx.ai AIProvider implementation.

All HTTP calls are mocked via pytest monkeypatching / unittest.mock so
these tests run entirely offline without real credentials.

Test strategy
-------------
- IAM token exchange: happy path, failure, cached token reuse
- stream_completion:  tokens yielded, HTTP errors surface as typed exceptions
- complete:           full text returned, HTTP errors surface as typed exceptions
"""

from __future__ import annotations

import json
import time
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.ai.base import AIAuthError, AIProviderError, AIRateLimitError, AITimeoutError
from app.ai.providers.granite import GraniteService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_iam_response(access_token: str = "test-token", expires_in: int = 3600):
    """Build a mock IAM token response."""
    mock = MagicMock()
    mock.status_code = 200
    mock.json.return_value = {"access_token": access_token, "expires_in": expires_in}
    return mock


def _make_generation_response(generated_text: str = "Hello, traveller!"):
    """Build a mock non-streaming generation response."""
    mock = MagicMock()
    mock.status_code = 200
    mock.json.return_value = {
        "results": [{"generated_text": generated_text}]
    }
    return mock


# ---------------------------------------------------------------------------
# IAM token tests
# ---------------------------------------------------------------------------

class TestGetIamToken:
    """Tests for GraniteService._get_iam_token()"""

    @pytest.mark.asyncio
    async def test_fetches_token_on_first_call(self):
        service = GraniteService()
        iam_response = _make_iam_response(access_token="fresh-token")

        with patch("app.ai.providers.granite.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(return_value=iam_response)
            mock_client_cls.return_value = mock_client

            token = await service._get_iam_token()

        assert token == "fresh-token"
        assert service._iam_token == "fresh-token"
        assert service._iam_token_expires_at > time.monotonic()

    @pytest.mark.asyncio
    async def test_returns_cached_token_on_second_call(self):
        """Second call must NOT make a new HTTP request."""
        service = GraniteService()
        service._iam_token = "cached-token"
        service._iam_token_expires_at = time.monotonic() + 9999  # far future

        with patch("app.ai.providers.granite.httpx.AsyncClient") as mock_client_cls:
            token = await service._get_iam_token()

        mock_client_cls.assert_not_called()
        assert token == "cached-token"

    @pytest.mark.asyncio
    async def test_refreshes_expired_token(self):
        """When the cached token is expired, a new one is fetched."""
        service = GraniteService()
        service._iam_token = "old-token"
        service._iam_token_expires_at = time.monotonic() - 1  # already expired

        iam_response = _make_iam_response(access_token="new-token")

        with patch("app.ai.providers.granite.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(return_value=iam_response)
            mock_client_cls.return_value = mock_client

            token = await service._get_iam_token()

        assert token == "new-token"

    @pytest.mark.asyncio
    async def test_raises_ai_auth_error_on_non_200(self):
        service = GraniteService()
        bad_response = MagicMock()
        bad_response.status_code = 400
        bad_response.text = "Bad request"

        with patch("app.ai.providers.granite.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(return_value=bad_response)
            mock_client_cls.return_value = mock_client

            with pytest.raises(AIAuthError):
                await service._get_iam_token()

    @pytest.mark.asyncio
    async def test_raises_ai_auth_error_on_timeout(self):
        import httpx as _httpx

        service = GraniteService()

        with patch("app.ai.providers.granite.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(
                side_effect=_httpx.TimeoutException("timeout")
            )
            mock_client_cls.return_value = mock_client

            with pytest.raises(AIAuthError, match="timed out"):
                await service._get_iam_token()


# ---------------------------------------------------------------------------
# complete() tests
# ---------------------------------------------------------------------------

class TestComplete:
    """Tests for GraniteService.complete() — non-streaming path."""

    async def _service_with_cached_token(self) -> GraniteService:
        service = GraniteService()
        service._iam_token = "test-token"
        service._iam_token_expires_at = time.monotonic() + 9999
        return service

    @pytest.mark.asyncio
    async def test_returns_generated_text(self):
        service = await self._service_with_cached_token()
        gen_response = _make_generation_response("Paris in spring!")

        with patch("app.ai.providers.granite.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(return_value=gen_response)
            mock_client_cls.return_value = mock_client

            result = await service.complete("Plan my trip to Paris.")

        assert result == "Paris in spring!"

    @pytest.mark.asyncio
    async def test_raises_ai_auth_error_on_401(self):
        service = await self._service_with_cached_token()
        error_response = MagicMock()
        error_response.status_code = 401
        error_response.text = "Unauthorized"

        with patch("app.ai.providers.granite.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(return_value=error_response)
            mock_client_cls.return_value = mock_client

            with pytest.raises(AIAuthError):
                await service.complete("prompt")

    @pytest.mark.asyncio
    async def test_raises_rate_limit_error_on_429(self):
        service = await self._service_with_cached_token()
        error_response = MagicMock()
        error_response.status_code = 429
        error_response.text = "Too Many Requests"

        with patch("app.ai.providers.granite.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(return_value=error_response)
            mock_client_cls.return_value = mock_client

            with pytest.raises(AIRateLimitError):
                await service.complete("prompt")

    @pytest.mark.asyncio
    async def test_raises_timeout_error_on_timeout(self):
        import httpx as _httpx

        service = await self._service_with_cached_token()

        with patch("app.ai.providers.granite.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(
                side_effect=_httpx.TimeoutException("timeout")
            )
            mock_client_cls.return_value = mock_client

            with pytest.raises(AITimeoutError):
                await service.complete("prompt")

    @pytest.mark.asyncio
    async def test_raises_provider_error_on_unexpected_shape(self):
        service = await self._service_with_cached_token()
        bad_response = MagicMock()
        bad_response.status_code = 200
        bad_response.json.return_value = {"unexpected": "shape"}

        with patch("app.ai.providers.granite.httpx.AsyncClient") as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client.post = AsyncMock(return_value=bad_response)
            mock_client_cls.return_value = mock_client

            with pytest.raises(AIProviderError, match="Unexpected"):
                await service.complete("prompt")


# ---------------------------------------------------------------------------
# stream_completion() tests
# ---------------------------------------------------------------------------

class TestStreamCompletion:
    """Tests for GraniteService.stream_completion() — streaming path."""

    def _make_stream_lines(self, texts: list[str]) -> list[str]:
        """Build the 'data: {...}' lines returned by the SSE stream."""
        lines = []
        for text in texts:
            chunk = {"results": [{"generated_text": text}]}
            lines.append(f"data: {json.dumps(chunk)}")
        lines.append("data: [DONE]")
        return lines

    async def _collect_stream(self, gen: AsyncGenerator[str, None]) -> list[str]:
        tokens = []
        async for token in gen:
            tokens.append(token)
        return tokens

    @pytest.mark.asyncio
    async def test_yields_tokens_from_stream(self):
        service = GraniteService()
        service._iam_token = "test-token"
        service._iam_token_expires_at = time.monotonic() + 9999

        expected_chunks = ["Hello", ", ", "traveller", "!"]
        stream_lines = self._make_stream_lines(expected_chunks)

        async def mock_aiter_lines():
            for line in stream_lines:
                yield line

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.aiter_lines = mock_aiter_lines

        with patch("app.ai.providers.granite.httpx.AsyncClient") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)

            # stream() returns a context manager wrapping mock_response
            mock_stream_cm = MagicMock()
            mock_stream_cm.__aenter__ = AsyncMock(return_value=mock_response)
            mock_stream_cm.__aexit__ = AsyncMock(return_value=None)
            mock_client.stream = MagicMock(return_value=mock_stream_cm)

            mock_client_cls.return_value = mock_client

            tokens = await self._collect_stream(
                service.stream_completion("Plan my trip.")
            )

        assert tokens == expected_chunks

    @pytest.mark.asyncio
    async def test_skips_empty_lines_and_non_data_lines(self):
        service = GraniteService()
        service._iam_token = "test-token"
        service._iam_token_expires_at = time.monotonic() + 9999

        chunk = {"results": [{"generated_text": "Tokyo"}]}
        lines = [
            "",                            # empty — should be skipped
            "event: ping",                 # non-data — should be skipped
            f"data: {json.dumps(chunk)}",  # real data
            "data: [DONE]",
        ]

        async def mock_aiter_lines():
            for line in lines:
                yield line

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.aiter_lines = mock_aiter_lines

        with patch("app.ai.providers.granite.httpx.AsyncClient") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_stream_cm = MagicMock()
            mock_stream_cm.__aenter__ = AsyncMock(return_value=mock_response)
            mock_stream_cm.__aexit__ = AsyncMock(return_value=None)
            mock_client.stream = MagicMock(return_value=mock_stream_cm)
            mock_client_cls.return_value = mock_client

            tokens = await self._collect_stream(
                service.stream_completion("Plan my trip.")
            )

        assert tokens == ["Tokyo"]

    @pytest.mark.asyncio
    async def test_raises_ai_auth_error_on_401(self):
        service = GraniteService()
        service._iam_token = "test-token"
        service._iam_token_expires_at = time.monotonic() + 9999

        mock_response = MagicMock()
        mock_response.status_code = 401

        with patch("app.ai.providers.granite.httpx.AsyncClient") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_stream_cm = MagicMock()
            mock_stream_cm.__aenter__ = AsyncMock(return_value=mock_response)
            mock_stream_cm.__aexit__ = AsyncMock(return_value=None)
            mock_client.stream = MagicMock(return_value=mock_stream_cm)
            mock_client_cls.return_value = mock_client

            with pytest.raises(AIAuthError):
                async for _ in service.stream_completion("prompt"):
                    pass

    @pytest.mark.asyncio
    async def test_raises_rate_limit_error_on_429(self):
        service = GraniteService()
        service._iam_token = "test-token"
        service._iam_token_expires_at = time.monotonic() + 9999

        mock_response = MagicMock()
        mock_response.status_code = 429

        with patch("app.ai.providers.granite.httpx.AsyncClient") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_stream_cm = MagicMock()
            mock_stream_cm.__aenter__ = AsyncMock(return_value=mock_response)
            mock_stream_cm.__aexit__ = AsyncMock(return_value=None)
            mock_client.stream = MagicMock(return_value=mock_stream_cm)
            mock_client_cls.return_value = mock_client

            with pytest.raises(AIRateLimitError):
                async for _ in service.stream_completion("prompt"):
                    pass
