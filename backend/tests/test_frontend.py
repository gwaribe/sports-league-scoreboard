"""Frontend navigation and assets coexist with the JSON API."""

import pytest
from starlette.routing import Mount

from app.frontend import FrontendStaticFiles
from app.main import app


@pytest.fixture()
def frontend_client(tmp_path, monkeypatch, client):
    bundle = tmp_path / "static"
    bundle.mkdir()
    (bundle / "index.html").write_text("<!doctype html><title>Scoreboard</title>")
    (bundle / "assets").mkdir()
    (bundle / "assets" / "app.js").write_text("console.log('scoreboard');")
    (bundle / "assets" / "app.css").write_text("body { margin: 0; }")
    (bundle / "robots.txt").write_text("User-agent: *")
    (tmp_path / "secret.txt").write_text("must not be served")
    (bundle / "secret-link.txt").symlink_to(tmp_path / "secret.txt")
    frontend = Mount("/", app=FrontendStaticFiles(directory=bundle, html=True))
    monkeypatch.setattr(app.router, "routes", [*app.routes, frontend])
    return client


@pytest.mark.parametrize("path", ["/", "/teams", "/control", "/teams/nested"])
def test_serves_spa_for_navigation(frontend_client, path):
    response = frontend_client.get(path)

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "<title>Scoreboard</title>" in response.text


@pytest.mark.parametrize(
    ("path", "content_type", "content"),
    [
        ("/assets/app.js", "javascript", "console.log('scoreboard');"),
        ("/assets/app.css", "text/css", "body { margin: 0; }"),
        ("/robots.txt", "text/plain", "User-agent: *"),
    ],
)
def test_serves_static_files(frontend_client, path, content_type, content):
    response = frontend_client.get(path)

    assert response.status_code == 200
    assert content_type in response.headers["content-type"]
    assert response.text == content


@pytest.mark.parametrize("path", ["/api", "/api/unknown", "/api/teams/unknown"])
def test_unknown_api_paths_remain_json_404s(frontend_client, path):
    response = frontend_client.get(path)

    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found"}


@pytest.mark.parametrize(
    "path",
    ["/assets/missing.js", "/assets/missing", "/missing.css", "/favicon.ico"],
)
def test_missing_assets_do_not_return_spa(frontend_client, path):
    assert frontend_client.get(path).status_code == 404


@pytest.mark.parametrize("path", ["/%2e%2e/secret.txt", "/secret-link.txt"])
def test_does_not_serve_files_outside_bundle(frontend_client, path):
    response = frontend_client.get(path)

    assert response.status_code == 404
    assert "must not be served" not in response.text


def test_api_and_documentation_still_work(frontend_client):
    teams = frontend_client.get("/api/teams")
    assert teams.status_code == 200
    assert isinstance(teams.json(), list)
    created = frontend_client.post("/api/teams", json={"name": "Docker Team"})
    assert created.status_code == 201
    assert created.json()["name"] == "Docker Team"
    assert frontend_client.get("/docs").status_code == 200
    assert "paths" in frontend_client.get("/openapi.json").json()


def test_head_navigation_and_invalid_method(frontend_client):
    response = frontend_client.head("/teams")
    assert response.status_code == 200
    assert response.content == b""
    assert frontend_client.post("/teams").status_code == 405
