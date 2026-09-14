"""Match endpoints: scheduling, lifecycle and live scoring (FR-2)."""

from __future__ import annotations


def _create_match(client, **overrides):
    payload = {"home_team_id": "team-1", "away_team_id": "team-2"}
    payload.update(overrides)
    response = client.post("/api/matches", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_list_matches(client):
    response = client.get("/api/matches")

    assert response.status_code == 200
    statuses = {match["status"] for match in response.json()}
    assert "scheduled" in statuses
    assert "live" in statuses
    assert "completed" in statuses


def test_create_match_initialises_scheduled_zero_zero(client):
    match = _create_match(client, scheduled_at=None)

    assert match["status"] == "scheduled"
    assert match["home_score"] == 0
    assert match["away_score"] == 0
    assert match["scheduled_at"] is None
    assert match["created_at"] == match["updated_at"]


def test_create_match_does_not_require_authentication(client):
    response = client.post(
        "/api/matches", json={"home_team_id": "team-1", "away_team_id": "team-2"}
    )

    assert response.status_code == 201


def test_create_match_accepts_scheduled_time(client):
    match = _create_match(client, scheduled_at="2026-09-14T08:00:00Z")

    assert match["scheduled_at"].startswith("2026-09-14T08:00:00")


def test_same_team_is_rejected(client):
    response = client.post(
        "/api/matches",
        json={"home_team_id": "team-1", "away_team_id": "team-1"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "A team cannot play itself."


def test_unknown_team_is_rejected(client):
    response = client.post(
        "/api/matches",
        json={"home_team_id": "team-1", "away_team_id": "team-999"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Unknown team selected."


def test_start_scheduled_match(client):
    match = _create_match(client)
    response = client.post(f"/api/matches/{match['id']}/start")

    assert response.status_code == 200
    assert response.json()["status"] == "live"


def test_start_non_scheduled_match_is_rejected(client):
    response = client.post("/api/matches/match-1/start")

    assert response.status_code == 400
    assert response.json()["detail"] == "Only a scheduled match can be started."


def test_start_unknown_match_is_404(client):
    response = client.post("/api/matches/match-999/start")

    assert response.status_code == 404
    assert response.json()["detail"] == "Match not found."


def test_score_update_on_scheduled_match_is_rejected(client):
    match = _create_match(client)
    response = client.patch(
        f"/api/matches/{match['id']}/score",
        json={"home_score": 1, "away_score": 0},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Start the match before entering scores."


def test_negative_score_is_rejected(client):
    response = client.patch(
        "/api/matches/match-3/score",
        json={"home_score": -1, "away_score": 10},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Scores must be whole numbers of zero or more."


def test_non_integer_score_is_rejected(client):
    response = client.patch(
        "/api/matches/match-3/score",
        json={"home_score": 1.5, "away_score": 10},
    )

    assert response.status_code == 400


def test_update_score_overwrites_absolute_values(client):
    response = client.patch(
        "/api/matches/match-3/score",
        json={"home_score": 55, "away_score": 48},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["home_score"] == 55
    assert body["away_score"] == 48
    assert body["status"] == "live"


def test_update_score_unknown_match_is_404(client):
    response = client.patch(
        "/api/matches/match-999/score",
        json={"home_score": 1, "away_score": 2},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Match not found."


def test_complete_non_live_match_is_rejected(client):
    response = client.post("/api/matches/match-4/complete")

    assert response.status_code == 400
    assert response.json()["detail"] == "Only a live match can be completed."


def test_complete_draw_is_rejected(client):
    client.patch(
        "/api/matches/match-3/score",
        json={"home_score": 40, "away_score": 40},
    )
    response = client.post("/api/matches/match-3/complete")

    assert response.status_code == 400
    assert (
        response.json()["detail"]
        == "Matches cannot end in a draw. Adjust the score first."
    )


def test_full_lifecycle(client):
    match = _create_match(client)

    started = client.post(f"/api/matches/{match['id']}/start")
    assert started.json()["status"] == "live"

    scored = client.patch(
        f"/api/matches/{match['id']}/score",
        json={"home_score": 30, "away_score": 20},
    )
    assert scored.json()["home_score"] == 30

    completed = client.post(f"/api/matches/{match['id']}/complete")
    assert completed.status_code == 200
    assert completed.json()["status"] == "completed"
