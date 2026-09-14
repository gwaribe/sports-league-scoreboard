"""Read-only league standings endpoint (FR-3)."""

from __future__ import annotations

from fastapi import APIRouter

from ..models import StandingRow
from ..standings import compute_standings
from ..store import store

router = APIRouter(prefix="/standings", tags=["Standings"])


@router.get("", response_model=list[StandingRow])
def get_standings() -> list[StandingRow]:
    """Return the sorted league table. Public."""
    return compute_standings(store)
