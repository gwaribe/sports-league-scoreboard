"""Authentication: password hashing, login and bearer-token protection."""

from __future__ import annotations

from app.auth import create_access_token, hash_password, verify_password
from app.seed import DEMO_PASSWORD, DEMO_USERNAME


def test_hash_password_is_salted_and_verifiable():
    first = hash_password("hunter2hunter2")
    second = hash_password("hunter2hunter2")

    assert first != second  # random salt
    assert "hunter2hunter2" not in first
    assert verify_password("hunter2hunter2", first)
    assert not verify_password("wrong-password", first)


def test_register_creates_account_without_leaking_password(client):
    response = client.post(
        "/api/auth/register", json={"username": "scorekeeper", "password": "supersecret"}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["username"] == "scorekeeper"
    assert "password" not in body
    assert "password_hash" not in body


def test_register_duplicate_username_is_rejected(client):
    payload = {"username": DEMO_USERNAME, "password": "anotherpass"}
    response = client.post("/api/auth/register", json=payload)

    assert response.status_code == 409
    assert response.json()["detail"] == "A user with that username already exists."


def test_login_returns_bearer_token(client):
    response = client.post(
        "/api/auth/login",
        json={"username": DEMO_USERNAME, "password": DEMO_PASSWORD},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["expires_in"] > 0


def test_login_with_wrong_password_is_rejected(client):
    response = client.post(
        "/api/auth/login",
        json={"username": DEMO_USERNAME, "password": "nope"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect username or password."


def test_login_with_unknown_user_is_rejected(client):
    response = client.post(
        "/api/auth/login", json={"username": "ghost", "password": "whatever"}
    )

    assert response.status_code == 401


def test_me_returns_current_user(client, auth_headers):
    response = client.get("/api/auth/me", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["username"] == DEMO_USERNAME


def test_me_without_token_is_401(client):
    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated."


def test_me_with_invalid_token_is_401(client):
    response = client.get(
        "/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
    )

    assert response.status_code == 401


def test_token_for_unknown_user_is_rejected(client):
    token = create_access_token("nobody")
    response = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 401
