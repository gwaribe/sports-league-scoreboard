"""Health endpoint used by deploy validation."""

from __future__ import annotations

import app as app_package


def test_health_reports_ok_and_version(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"] == app_package.__version__
    assert "commit" in body


def test_health_reports_deployed_commit(client, monkeypatch):
    monkeypatch.setenv("RENDER_GIT_COMMIT", "abc1234")

    assert client.get("/api/health").json()["commit"] == "abc1234"


def test_health_commit_is_null_without_host_metadata(client, monkeypatch):
    for name in ("RENDER_GIT_COMMIT", "GIT_COMMIT", "SOURCE_VERSION"):
        monkeypatch.delenv(name, raising=False)

    assert client.get("/api/health").json()["commit"] is None


def test_health_requires_no_authentication(client):
    assert client.get("/api/health").status_code == 200
