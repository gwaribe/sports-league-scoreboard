"""League table computation (FR-3).

Standings are derived on demand from ``completed`` matches only. Draws are
disallowed at match completion, so every completed match contributes exactly one
win and one loss.
"""

from __future__ import annotations

from .models import StandingRow, Team
from .store import Store


def compute_standings(store: Store) -> list[StandingRow]:
    """Return one standing row per team, sorted per the spec."""
    teams: list[Team] = store.list_teams()
    table: dict[str, StandingRow] = {
        team.id: StandingRow(
            team_id=team.id,
            team_name=team.name,
            played=0,
            won=0,
            lost=0,
            points_for=0,
            points_against=0,
            point_diff=0,
            points=0,
        )
        for team in teams
    }

    for match in store.completed_matches():
        home = table.get(match.home_team_id)
        away = table.get(match.away_team_id)
        if home is None or away is None:
            continue

        home.played += 1
        away.played += 1
        home.points_for += match.home_score
        home.points_against += match.away_score
        away.points_for += match.away_score
        away.points_against += match.home_score

        if match.home_score > match.away_score:
            home.won += 1
            away.lost += 1
        elif match.away_score > match.home_score:
            away.won += 1
            home.lost += 1

    for row in table.values():
        row.point_diff = row.points_for - row.points_against
        row.points = row.won

    return sorted(
        table.values(),
        key=lambda row: (-row.points, -row.point_diff, -row.points_for, row.team_name),
    )
