"""Teams endpoints: listing and creation (FR-1)."""

from __future__ import annotations


def test_list_teams(client):
    response = client.get("/api/teams")

    assert response.status_code == 200
    names = [team["name"] for team in response.json()]
    assert "Northside Nomads" in names
    assert "Harbour Hawks" in names


def test_create_team_returns_201(client):
    response = client.post(
        "/api/teams",
        json={"name": "  Metro Miners  ", "logo_url": "  https://example.com/miners.png  "},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["id"].startswith("team-")
    assert body["name"] == "Metro Miners"  # trimmed
    assert body["logo_url"] == "https://example.com/miners.png"
    assert body["created_at"]


def test_create_team_does_not_require_authentication(client):
    response = client.post("/api/teams", json={"name": "Open Access FC"})

    assert response.status_code == 201


def test_blank_logo_url_is_stored_as_null(client):
    response = client.post(
        "/api/teams",
        json={"name": "Null Logo FC", "logo_url": "   "},
    )

    assert response.status_code == 201
    assert response.json()["logo_url"] is None


def test_blank_name_is_rejected(client):
    response = client.post("/api/teams", json={"name": "   "})

    assert response.status_code == 400
    assert response.json()["detail"] == "Team name is required."


def test_duplicate_name_is_rejected_case_insensitively(client):
    response = client.post("/api/teams", json={"name": "northside nomads"})

    assert response.status_code == 409
    assert response.json()["detail"] == "A team with that name already exists."


def test_created_team_appears_in_listing(client):
    client.post("/api/teams", json={"name": "Fresh Franchise"})

    names = [team["name"] for team in client.get("/api/teams").json()]
    assert "Fresh Franchise" in names
