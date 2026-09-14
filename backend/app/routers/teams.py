"""Team registration and listing endpoints (FR-1)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from ..models import CreateTeamInput, Team
from ..store import DuplicateTeamNameError, store

router = APIRouter(prefix="/teams", tags=["Teams"])


@router.get("", response_model=list[Team])
def list_teams() -> list[Team]:
    """Return every registered team."""
    return store.list_teams()


@router.post("", response_model=Team, status_code=status.HTTP_201_CREATED)
def create_team(payload: CreateTeamInput) -> Team:
    """Register a new team."""
    try:
        return store.create_team(payload.name, payload.logo_url)
    except DuplicateTeamNameError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A team with that name already exists.",
        ) from exc
