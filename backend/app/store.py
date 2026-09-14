"""Thread-safe in-memory store for teams and matches.

The store stands in for a database: a process-lifetime singleton keeps the data
in plain dicts, guards every read/write with a re-entrant lock, and assigns the
``team-1`` / ``match-1`` style ids used throughout ``openapi.yaml``.

A fresh database is seeded with a small demo league so the frontend has
something to render on first load.
"""

from __future__ import annotations

import threading

from .models import Match, MatchStatus, Team, utc_now


class DuplicateTeamNameError(Exception):
    """Raised when a team name already exists (case-insensitive)."""


class Store:
    """In-memory collections for the whole league."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._teams: dict[str, Team] = {}
        self._matches: dict[str, Match] = {}
        self._team_seq = 0
        self._match_seq = 0

    # -- lifecycle ---------------------------------------------------------

    def reset(self) -> None:
        """Drop all data and reset id counters."""
        with self._lock:
            self._teams.clear()
            self._matches.clear()
            self._team_seq = 0
            self._match_seq = 0

    @property
    def is_empty(self) -> bool:
        with self._lock:
            return not self._teams and not self._matches

    # -- teams -------------------------------------------------------------

    def list_teams(self) -> list[Team]:
        with self._lock:
            return [team.model_copy(deep=True) for team in self._teams.values()]

    def get_team(self, team_id: str) -> Team | None:
        with self._lock:
            team = self._teams.get(team_id)
            return team.model_copy(deep=True) if team else None

    def find_team_by_name(self, name: str) -> Team | None:
        target = name.strip().casefold()
        with self._lock:
            for team in self._teams.values():
                if team.name.casefold() == target:
                    return team.model_copy(deep=True)
        return None

    def create_team(self, name: str, logo_url: str | None) -> Team:
        with self._lock:
            if self.find_team_by_name(name) is not None:
                raise DuplicateTeamNameError(name)
            self._team_seq += 1
            team = Team(
                id=f"team-{self._team_seq}",
                name=name,
                logo_url=logo_url,
                created_at=utc_now(),
            )
            self._teams[team.id] = team
            return team.model_copy(deep=True)

    # -- matches -----------------------------------------------------------

    def list_matches(self) -> list[Match]:
        with self._lock:
            return [match.model_copy(deep=True) for match in self._matches.values()]

    def get_match(self, match_id: str) -> Match | None:
        with self._lock:
            match = self._matches.get(match_id)
            return match.model_copy(deep=True) if match else None

    def create_match(
        self,
        home_team_id: str,
        away_team_id: str,
        scheduled_at,
    ) -> Match:
        with self._lock:
            self._match_seq += 1
            now = utc_now()
            match = Match(
                id=f"match-{self._match_seq}",
                home_team_id=home_team_id,
                away_team_id=away_team_id,
                home_score=0,
                away_score=0,
                status=MatchStatus.scheduled,
                scheduled_at=scheduled_at,
                created_at=now,
                updated_at=now,
            )
            self._matches[match.id] = match
            return match.model_copy(deep=True)

    def update_match(self, match_id: str, **changes) -> Match | None:
        """Apply ``changes`` to a stored match and refresh ``updated_at``."""
        with self._lock:
            match = self._matches.get(match_id)
            if match is None:
                return None
            for key, value in changes.items():
                setattr(match, key, value)
            match.updated_at = utc_now()
            return match.model_copy(deep=True)

    def completed_matches(self) -> list[Match]:
        with self._lock:
            return [
                match.model_copy(deep=True)
                for match in self._matches.values()
                if match.status == MatchStatus.completed
            ]


# Module-level singleton shared by the app and its dependencies.
store = Store()
