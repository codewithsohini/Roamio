"""
tests/routers/test_auth.py
===========================
Endpoint-level tests for Milestone 4 authentication.

Strategy
--------
- Uses Starlette's TestClient — no running server needed.
- Database is provided by tests/conftest.py (SQLite in-memory, reset per test).
- Tests cover registration, login, protected routes, and all error paths.
"""

import pytest
from starlette.testclient import TestClient

from app.main import app

# ---------------------------------------------------------------------------
# Client fixture
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    """Returns a TestClient. DB override is already active via conftest."""
    return TestClient(app, raise_server_exceptions=True)


# Reusable valid registration payload
VALID_USER = {"email": "traveller@example.com", "password": "SecurePass123!"}


# ---------------------------------------------------------------------------
# Registration tests — POST /auth/register
# ---------------------------------------------------------------------------

class TestRegister:
    def test_register_success_returns_201(self, client):
        """Happy path: valid credentials → 201 + user response body."""
        res = client.post("/auth/register", json=VALID_USER)
        assert res.status_code == 201, res.text
        body = res.json()
        assert body["email"] == VALID_USER["email"]
        assert "id" in body
        assert "created_at" in body
        assert "updated_at" in body

    def test_register_never_returns_password(self, client):
        """hashed_password must NEVER appear in any response."""
        res = client.post("/auth/register", json=VALID_USER)
        body_str = res.text
        assert "password" not in body_str
        assert "hashed" not in body_str

    def test_register_duplicate_email_returns_409(self, client):
        """Second registration with same email → 409 Conflict."""
        client.post("/auth/register", json=VALID_USER)
        res = client.post("/auth/register", json=VALID_USER)
        assert res.status_code == 409
        assert "already exists" in res.json()["detail"]

    def test_register_invalid_email_returns_422(self, client):
        """Malformed email → 422 Unprocessable Entity."""
        res = client.post("/auth/register", json={"email": "not-an-email", "password": "Pass123!"})
        assert res.status_code == 422

    def test_register_short_password_returns_422(self, client):
        """Password shorter than 8 chars → 422."""
        res = client.post("/auth/register", json={"email": "a@b.com", "password": "short"})
        assert res.status_code == 422

    def test_register_missing_email_returns_422(self, client):
        """Missing required email field → 422."""
        res = client.post("/auth/register", json={"password": "SecurePass123!"})
        assert res.status_code == 422

    def test_register_missing_password_returns_422(self, client):
        """Missing required password field → 422."""
        res = client.post("/auth/register", json={"email": "a@b.com"})
        assert res.status_code == 422


# ---------------------------------------------------------------------------
# Login tests — POST /auth/login
# ---------------------------------------------------------------------------

class TestLogin:
    def test_login_success_returns_token(self, client):
        """Happy path: correct credentials → 200 + JWT token."""
        client.post("/auth/register", json=VALID_USER)
        res = client.post(
            "/auth/login",
            data={"username": VALID_USER["email"], "password": VALID_USER["password"]},
        )
        assert res.status_code == 200, res.text
        body = res.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"
        assert len(body["access_token"]) > 20

    def test_login_wrong_password_returns_401(self, client):
        """Wrong password → 401 with vague message."""
        client.post("/auth/register", json=VALID_USER)
        res = client.post(
            "/auth/login",
            data={"username": VALID_USER["email"], "password": "WrongPassword!"},
        )
        assert res.status_code == 401
        assert "Invalid email or password" in res.json()["detail"]

    def test_login_unknown_email_returns_401(self, client):
        """Email not registered → 401 (same message — no enumeration)."""
        res = client.post(
            "/auth/login",
            data={"username": "nobody@example.com", "password": "Pass123!"},
        )
        assert res.status_code == 401
        assert "Invalid email or password" in res.json()["detail"]

    def test_login_wrong_and_correct_same_error(self, client):
        """Wrong password and unknown email return identical error messages."""
        client.post("/auth/register", json=VALID_USER)
        wrong_pass = client.post(
            "/auth/login",
            data={"username": VALID_USER["email"], "password": "Wrong!"},
        )
        unknown_user = client.post(
            "/auth/login",
            data={"username": "nobody@x.com", "password": "Pass123!"},
        )
        assert wrong_pass.json()["detail"] == unknown_user.json()["detail"]


# ---------------------------------------------------------------------------
# Protected route tests — GET /users/me
# ---------------------------------------------------------------------------

class TestGetMe:
    def _register_and_login(self, client) -> str:
        """Helper: register a user and return a valid access token."""
        client.post("/auth/register", json=VALID_USER)
        res = client.post(
            "/auth/login",
            data={"username": VALID_USER["email"], "password": VALID_USER["password"]},
        )
        return res.json()["access_token"]

    def test_get_me_with_valid_token(self, client):
        """Valid token → 200 + user data including has_travel_profile=True."""
        token = self._register_and_login(client)
        res = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["email"] == VALID_USER["email"]
        assert body["has_travel_profile"] is True   # auto-created on register

    def test_get_me_without_token_returns_401(self, client):
        """No Authorization header → 401."""
        res = client.get("/users/me")
        assert res.status_code == 401

    def test_get_me_with_invalid_token_returns_401(self, client):
        """Garbage token → 401."""
        res = client.get("/users/me", headers={"Authorization": "Bearer not.a.real.token"})
        assert res.status_code == 401

    def test_get_me_with_tampered_token_returns_401(self, client):
        """Valid structure, tampered payload → 401 (signature mismatch)."""
        token = self._register_and_login(client)
        parts = token.split(".")
        # Flip the last character of the signature section
        tampered = parts[0] + "." + parts[1] + "." + parts[2][:-1] + (
            "A" if parts[2][-1] != "A" else "B"
        )
        res = client.get("/users/me", headers={"Authorization": f"Bearer {tampered}"})
        assert res.status_code == 401

    def test_get_me_never_exposes_password(self, client):
        """Response body must never contain any password field."""
        token = self._register_and_login(client)
        res = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
        body_str = res.text
        assert "password" not in body_str
        assert "hashed" not in body_str


# ---------------------------------------------------------------------------
# Auth service unit tests — pure Python, no HTTP
# ---------------------------------------------------------------------------

class TestAuthService:
    def test_hash_and_verify_password(self):
        from app.services.auth_service import hash_password, verify_password
        plain = "MySecurePassword!"
        hashed = hash_password(plain)
        assert hashed != plain
        assert verify_password(plain, hashed) is True
        assert verify_password("wrong", hashed) is False

    def test_hash_is_not_deterministic(self):
        """bcrypt should produce different hashes for same input (salt randomness)."""
        from app.services.auth_service import hash_password
        h1 = hash_password("same_password")
        h2 = hash_password("same_password")
        assert h1 != h2   # different salts → different hashes

    def test_create_and_decode_access_token(self):
        from app.services.auth_service import create_access_token, decode_access_token
        user_id = "test-uuid-1234"
        token = create_access_token(user_id=user_id)
        assert isinstance(token, str)
        assert len(token) > 20
        token_data = decode_access_token(token)
        assert token_data.user_id == user_id

    def test_expired_token_raises(self):
        from datetime import timedelta
        from jose import JWTError
        from app.services.auth_service import create_access_token, decode_access_token
        token = create_access_token(user_id="x", expires_delta=timedelta(seconds=-1))
        with pytest.raises(JWTError):
            decode_access_token(token)

    def test_tampered_token_raises(self):
        from jose import JWTError
        from app.services.auth_service import decode_access_token
        with pytest.raises(JWTError):
            decode_access_token("this.is.not.valid")
