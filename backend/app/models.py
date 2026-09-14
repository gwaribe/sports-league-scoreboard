"""Pydantic models mirroring the schemas in ``openapi.yaml``."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def utc_now() -> datetime:
    """Return the current time as an aware UTC datetime."""
    return datetime.now(timezone.utc)


class MatchStatus(str, Enum):
    """Lifecycle state of a match: scheduled -> live -> completed."""

    scheduled = "scheduled"
    live = "live"
    completed = "completed"


class Team(BaseModel):
    """A registered team (FR-1.1, FR-1.2)."""

    model_config = ConfigDict(extra="forbid")

    id: str
    name: str = Field(max_length=100)
    logo_url: str | None = Field(default=None, max_length=255)
    created_at: datetime


class Match(BaseModel):
    """A fixture between two teams, including live and final scores (FR-2)."""

    model_config = ConfigDict(extra="forbid")

    id: str
    home_team_id: str
    away_team_id: str
    home_score: int
    away_score: int
    status: MatchStatus
    scheduled_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class StandingRow(BaseModel):
    """One team's aggregated row in the league table (FR-3)."""

    model_config = ConfigDict(extra="forbid")

    team_id: str
    team_name: str
    played: int
    won: int
    lost: int
    points_for: int
    points_against: int
    point_diff: int
    points: int


class CreateTeamInput(BaseModel):
    """Request body for ``POST /teams``."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(max_length=100)
    logo_url: str | None = Field(default=None, max_length=255)

    @field_validator("name")
    @classmethod
    def _trim_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Team name is required.")
        return value

    @field_validator("logo_url")
    @classmethod
    def _clean_logo_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class CreateMatchInput(BaseModel):
    """Request body for ``POST /matches``."""

    model_config = ConfigDict(extra="forbid")

    home_team_id: str = Field(min_length=1)
    away_team_id: str = Field(min_length=1)
    scheduled_at: datetime | None = None


class UpdateScoreInput(BaseModel):
    """Request body for ``PATCH /matches/{matchId}/score``."""

    model_config = ConfigDict(extra="forbid")

    home_score: int
    away_score: int

    @model_validator(mode="after")
    def _validate_scores(self) -> "UpdateScoreInput":
        if self.home_score < 0 or self.away_score < 0:
            raise ValueError("Scores must be whole numbers of zero or more.")
        return self


class RegisterInput(BaseModel):
    """Request body for ``POST /auth/register``."""

    model_config = ConfigDict(extra="forbid")

    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def _trim_username(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Username is required.")
        return value


class LoginInput(BaseModel):
    """Request body for ``POST /auth/login``."""

    model_config = ConfigDict(extra="forbid")

    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class User(BaseModel):
    """A stored operator account (public representation)."""

    model_config = ConfigDict(extra="forbid")

    username: str
    created_at: datetime


class TokenResponse(BaseModel):
    """Response body for the auth endpoints."""

    model_config = ConfigDict(extra="forbid")

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class Error(BaseModel):
    """Standard error payload; the frontend shows ``detail`` verbatim."""

    model_config = ConfigDict(extra="forbid")

    detail: str
