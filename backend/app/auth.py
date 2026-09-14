"""Password hashing, bearer-token issuing/verification and auth dependencies.

Passwords are stored as salted PBKDF2-SHA256 hashes (stdlib only). Access tokens
are compact JWT-style tokens: ``base64url(header).base64url(payload).signature``
signed with HMAC-SHA256 and carrying an expiry, so they can be verified without
any server-side session state.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .models import User
from .store import store

_PBKDF2_ITERATIONS = 200_000
_PBKDF2_ALGORITHM = "sha256"
_SECRET_KEY = os.environ.get("SCOREBOARD_SECRET_KEY", "dev-secret-change-me").encode()
_ALGORITHM = "HS256"
DEFAULT_TOKEN_TTL_SECONDS = 60 * 60  # 1 hour


def hash_password(password: str) -> str:
    """Hash ``password`` with a fresh random salt."""
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        _PBKDF2_ALGORITHM, password.encode(), salt, _PBKDF2_ITERATIONS
    )
    return (
        f"pbkdf2_{_PBKDF2_ALGORITHM}${_PBKDF2_ITERATIONS}"
        f"${salt.hex()}${digest.hex()}"
    )


def verify_password(password: str, encoded: str) -> bool:
    """Check ``password`` against a hash produced by :func:`hash_password`."""
    try:
        algorithm, iterations, salt_hex, digest_hex = encoded.split("$")
        prefix, _, name = algorithm.partition("_")
        if prefix != "pbkdf2" or name != _PBKDF2_ALGORITHM:
            return False
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(digest_hex)
        candidate = hashlib.pbkdf2_hmac(
            name, password.encode(), salt, int(iterations)
        )
    except (ValueError, AttributeError):
        return False
    return hmac.compare_digest(candidate, expected)


class InvalidTokenError(Exception):
    """Raised when a bearer token is malformed, unsigned or expired."""


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _sign(message: bytes) -> bytes:
    return hmac.new(_SECRET_KEY, message, hashlib.sha256).digest()


def create_access_token(
    subject: str, expires_in: int = DEFAULT_TOKEN_TTL_SECONDS
) -> str:
    """Create a signed bearer token identifying ``subject``."""
    header = {"alg": _ALGORITHM, "typ": "JWT"}
    now = int(time.time())
    payload = {"sub": subject, "iat": now, "exp": now + expires_in}
    segments = [
        _b64url_encode(json.dumps(header, separators=(",", ":")).encode()),
        _b64url_encode(json.dumps(payload, separators=(",", ":")).encode()),
    ]
    signing_input = ".".join(segments).encode()
    signature = _b64url_encode(_sign(signing_input))
    return f"{segments[0]}.{segments[1]}.{signature}"


def decode_access_token(token: str) -> dict:
    """Verify a token and return its payload, or raise :class:`InvalidTokenError`."""
    try:
        header_segment, payload_segment, signature_segment = token.split(".")
    except ValueError as exc:
        raise InvalidTokenError("Malformed token.") from exc

    signing_input = f"{header_segment}.{payload_segment}".encode()
    expected = _sign(signing_input)
    try:
        provided = _b64url_decode(signature_segment)
    except (ValueError, TypeError) as exc:
        raise InvalidTokenError("Malformed token.") from exc

    if not hmac.compare_digest(expected, provided):
        raise InvalidTokenError("Invalid token signature.")

    try:
        payload = json.loads(_b64url_decode(payload_segment))
    except (ValueError, TypeError) as exc:
        raise InvalidTokenError("Malformed token.") from exc

    if not isinstance(payload, dict):
        raise InvalidTokenError("Malformed token.")
    if payload.get("exp", 0) < int(time.time()):
        raise InvalidTokenError("Token has expired.")
    return payload


_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> User:
    """FastAPI dependency: resolve the account behind a bearer token."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    try:
        payload = decode_access_token(credentials.credentials)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    record = store.get_user(payload.get("sub", ""))
    if record is None:
        raise unauthorized
    return record.public()
