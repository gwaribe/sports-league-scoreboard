"""Shared pytest fixtures."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.seed import DEMO_PASSWORD, DEMO_USERNAME
from app.store import store


@pytest.fixture()
def client():
    """A TestClient backed by a freshly seeded store."""
    store.reset()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def empty_client():
    """A TestClient with an empty store (startup seeding cleared)."""
    store.reset()
    with TestClient(app) as test_client:
        store.reset()
        yield test_client


@pytest.fixture()
def auth_headers(client) -> dict[str, str]:
    """Bearer headers for the seeded demo operator."""
    response = client.post(
        "/api/auth/login",
        json={"username": DEMO_USERNAME, "password": DEMO_PASSWORD},
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
