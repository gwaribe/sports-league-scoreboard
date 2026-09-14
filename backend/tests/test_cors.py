"""CORS: the local frontend origin may call the API from the browser."""

from __future__ import annotations


def test_allows_local_frontend_origin(client):
    response = client.get("/api/teams", headers={"Origin": "http://localhost:5173"})

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_allows_preflight_from_local_origin(client):
    response = client.options(
        "/api/teams",
        headers={
            "Origin": "http://127.0.0.1:8080",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:8080"


def test_does_not_allow_non_local_origin(client):
    response = client.get("/api/teams", headers={"Origin": "https://evil.example"})

    assert "access-control-allow-origin" not in response.headers
