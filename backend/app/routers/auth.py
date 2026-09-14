"""Authentication endpoints: register, login and current-user lookup."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import (
    DEFAULT_TOKEN_TTL_SECONDS,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from ..models import LoginInput, RegisterInput, TokenResponse, User
from ..store import store

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterInput) -> User:
    """Create an operator account. Passwords are stored hashed."""
    if store.has_user(payload.username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with that username already exists.",
        )
    return store.create_user(payload.username, hash_password(payload.password))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginInput) -> TokenResponse:
    """Exchange a username and password for a bearer token."""
    record = store.get_user(payload.username)
    if record is None or not verify_password(payload.password, record.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenResponse(
        access_token=create_access_token(record.username),
        expires_in=DEFAULT_TOKEN_TTL_SECONDS,
    )


@router.get("/me", response_model=User)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    """Return the account behind the supplied bearer token."""
    return current_user
