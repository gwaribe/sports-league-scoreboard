"""SQLAlchemy ORM entities for the league."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all ORM entities."""


class TeamRecord(Base):
    """A registered team persisted in the database."""

    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    name_key: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    logo_url: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    @property
    def public_id(self) -> str:
        return f"team-{self.id}"


class MatchRecord(Base):
    """A match and its lifecycle state persisted in the database."""

    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(primary_key=True)
    home_team_id: Mapped[int] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    away_team_id: Mapped[int] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    home_score: Mapped[int] = mapped_column(nullable=False, default=0)
    away_score: Mapped[int] = mapped_column(nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    @property
    def public_id(self) -> str:
        return f"match-{self.id}"
