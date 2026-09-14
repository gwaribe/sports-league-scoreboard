"""Seed the in-memory store with a small demo league.

The data mirrors the examples in ``openapi.yaml`` so the frontend has teams,
live matches, results and a populated standings table as soon as the server
starts. Seeding is idempotent: it only runs when the store is empty.
"""

from __future__ import annotations

from datetime import timedelta

from .models import MatchStatus, utc_now
from .store import Store

_TEAMS = [
    ("Northside Nomads", None),
    ("Harbour Hawks", "https://example.com/hawks.png"),
    ("Vale Vipers", None),
    ("Riverside Ravens", None),
]

# (home index, away index, home score, away score, status, scheduled offset hours)
_MATCHES = [
    (0, 1, 82, 74, MatchStatus.completed, -1),
    (2, 3, 68, 61, MatchStatus.completed, -1),
    (0, 2, 45, 41, MatchStatus.live, 0),
    (1, 3, 0, 0, MatchStatus.scheduled, 2),
]


def seed_store(store: Store) -> Store:
    """Populate ``store`` with demo data if it is currently empty."""
    if not store.is_empty:
        return store

    team_ids: list[str] = []
    for name, logo_url in _TEAMS:
        team_ids.append(store.create_team(name, logo_url).id)

    now = utc_now()
    for home, away, home_score, away_score, status_, offset in _MATCHES:
        match = store.create_match(
            team_ids[home],
            team_ids[away],
            scheduled_at=None
            if status_ == MatchStatus.live
            else now + timedelta(hours=offset),
        )
        store.update_match(
            match.id,
            home_score=home_score,
            away_score=away_score,
            status=status_,
        )

    return store
