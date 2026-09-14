"""Database-backed storage for teams and matches.

The public methods use the API's ``team-1`` / ``match-1`` identifiers while the
database uses database-agnostic integer primary keys and foreign keys.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import SessionLocal, engine
from .entities import Base, MatchRecord, TeamRecord
from .models import Match, MatchStatus, Team, utc_now


class DuplicateTeamNameError(Exception):
    """Raised when a team name already exists (case-insensitive)."""


def _internal_id(public_id: str, prefix: str) -> int:
    if not public_id.startswith(prefix):
        raise ValueError(f"Invalid {prefix} id")
    value = public_id.removeprefix(prefix)
    if not value.isdigit():
        raise ValueError(f"Invalid {prefix} id")
    return int(value)


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _team_model(record: TeamRecord) -> Team:
    return Team(
        id=record.public_id,
        name=record.name,
        logo_url=record.logo_url,
        created_at=_as_utc(record.created_at),
    )


def _match_model(record: MatchRecord) -> Match:
    return Match(
        id=record.public_id,
        home_team_id=f"team-{record.home_team_id}",
        away_team_id=f"team-{record.away_team_id}",
        home_score=record.home_score,
        away_score=record.away_score,
        status=MatchStatus(record.status),
        scheduled_at=(
            _as_utc(record.scheduled_at) if record.scheduled_at is not None else None
        ),
        created_at=_as_utc(record.created_at),
        updated_at=_as_utc(record.updated_at),
    )


class Store:
    """Persistent collections for the whole league."""

    def initialize(self) -> None:
        """Create the application tables without a migration tool."""
        Base.metadata.create_all(engine)

    def reset(self) -> None:
        """Drop and recreate all data in the configured database."""
        Base.metadata.drop_all(engine)
        self.initialize()

    @property
    def is_empty(self) -> bool:
        with SessionLocal() as session:
            return (
                session.scalar(select(TeamRecord.id).limit(1)) is None
                and session.scalar(select(MatchRecord.id).limit(1)) is None
            )

    def list_teams(self) -> list[Team]:
        with SessionLocal() as session:
            records = session.scalars(select(TeamRecord).order_by(TeamRecord.id))
            return [_team_model(record) for record in records]

    def get_team(self, team_id: str) -> Team | None:
        try:
            internal_id = _internal_id(team_id, "team-")
        except ValueError:
            return None
        with SessionLocal() as session:
            record = session.get(TeamRecord, internal_id)
            return _team_model(record) if record is not None else None

    def find_team_by_name(self, name: str) -> Team | None:
        with SessionLocal() as session:
            record = session.scalar(
                select(TeamRecord).where(TeamRecord.name_key == name.strip().casefold())
            )
            return _team_model(record) if record is not None else None

    def create_team(self, name: str, logo_url: str | None) -> Team:
        record = TeamRecord(
            name=name,
            name_key=name.strip().casefold(),
            logo_url=logo_url,
            created_at=utc_now(),
        )
        try:
            with SessionLocal() as session:
                session.add(record)
                session.commit()
                return _team_model(record)
        except IntegrityError as exc:
            raise DuplicateTeamNameError(name) from exc

    def list_matches(self) -> list[Match]:
        with SessionLocal() as session:
            records = session.scalars(select(MatchRecord).order_by(MatchRecord.id))
            return [_match_model(record) for record in records]

    def get_match(self, match_id: str) -> Match | None:
        try:
            internal_id = _internal_id(match_id, "match-")
        except ValueError:
            return None
        with SessionLocal() as session:
            record = session.get(MatchRecord, internal_id)
            return _match_model(record) if record is not None else None

    def create_match(
        self,
        home_team_id: str,
        away_team_id: str,
        scheduled_at: datetime | None,
    ) -> Match:
        now = utc_now()
        record = MatchRecord(
            home_team_id=_internal_id(home_team_id, "team-"),
            away_team_id=_internal_id(away_team_id, "team-"),
            home_score=0,
            away_score=0,
            status=MatchStatus.scheduled.value,
            scheduled_at=scheduled_at,
            created_at=now,
            updated_at=now,
        )
        with SessionLocal() as session:
            session.add(record)
            session.commit()
            return _match_model(record)

    def update_match(self, match_id: str, **changes) -> Match | None:
        try:
            internal_id = _internal_id(match_id, "match-")
        except ValueError:
            return None
        with SessionLocal() as session:
            record = session.get(MatchRecord, internal_id)
            if record is None:
                return None
            for key, value in changes.items():
                if key == "status":
                    value = value.value
                setattr(record, key, value)
            record.updated_at = utc_now()
            session.commit()
            return _match_model(record)

    def completed_matches(self) -> list[Match]:
        with SessionLocal() as session:
            records = session.scalars(
                select(MatchRecord)
                .where(MatchRecord.status == MatchStatus.completed.value)
                .order_by(MatchRecord.id)
            )
            return [_match_model(record) for record in records]


# Module-level singleton shared by the app and its dependencies.
store = Store()
