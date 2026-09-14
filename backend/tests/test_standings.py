"""Standings endpoint: aggregation, sorting and public access (FR-3)."""

from __future__ import annotations


def _row_by_team(rows):
    return {row["team_id"]: row for row in rows}


def test_standings_is_public_and_sorted(client):
    response = client.get("/api/standings")

    assert response.status_code == 200
    rows = response.json()
    # Two winners (1 point each) ranked by point difference, then the losers.
    assert [row["team_id"] for row in rows] == ["team-1", "team-3", "team-4", "team-2"]


def test_standings_aggregates_completed_matches_only(client):
    rows = _row_by_team(client.get("/api/standings").json())

    nomads = rows["team-1"]
    assert nomads["played"] == 1  # the live match does not count
    assert nomads["won"] == 1
    assert nomads["lost"] == 0
    assert nomads["points_for"] == 82
    assert nomads["points_against"] == 74
    assert nomads["point_diff"] == 8
    assert nomads["points"] == 1

    hawks = rows["team-2"]
    assert hawks["played"] == 1
    assert hawks["won"] == 0
    assert hawks["lost"] == 1
    assert hawks["points"] == 0


def test_team_without_completed_matches_has_zero_row(client, auth_headers):
    created = client.post(
        "/api/teams", json={"name": "Benched Braves"}, headers=auth_headers
    ).json()

    rows = _row_by_team(client.get("/api/standings").json())
    row = rows[created["id"]]
    assert row["played"] == 0
    assert row["won"] == 0
    assert row["lost"] == 0
    assert row["points_for"] == 0
    assert row["points_against"] == 0
    assert row["point_diff"] == 0
    assert row["points"] == 0


def test_completing_a_match_updates_standings(client, auth_headers):
    before = _row_by_team(client.get("/api/standings").json())
    assert before["team-3"]["won"] == 1

    # Finish the live match (team-1 45 - 41 team-3) with the away side ahead.
    client.patch(
        "/api/matches/match-3/score",
        json={"home_score": 41, "away_score": 50},
        headers=auth_headers,
    )
    response = client.post("/api/matches/match-3/complete", headers=auth_headers)
    assert response.status_code == 200

    after = _row_by_team(client.get("/api/standings").json())
    assert after["team-3"]["played"] == 2
    assert after["team-3"]["won"] == 2
    assert after["team-1"]["played"] == 2
    assert after["team-1"]["lost"] == 1
    # Vipers keep top spot with 2 points.
    assert client.get("/api/standings").json()[0]["team_id"] == "team-3"


def test_standings_sort_ties_by_points_for(client, auth_headers):
    # Two teams with equal points and diff, ordered by points_for descending.
    rows = client.get("/api/standings").json()
    winners = [row for row in rows if row["points"] == 1]
    assert winners[0]["points_for"] >= winners[1]["points_for"]
