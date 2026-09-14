"""Match scheduling, live scoring and lifecycle endpoints (FR-2)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from ..models import CreateMatchInput, Match, MatchStatus, UpdateScoreInput
from ..store import store

router = APIRouter(prefix="/matches", tags=["Matches"])

_MATCH_NOT_FOUND = "Match not found."


def _require_match(match_id: str) -> Match:
    match = store.get_match(match_id)
    if match is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=_MATCH_NOT_FOUND
        )
    return match


@router.get("", response_model=list[Match])
def list_matches() -> list[Match]:
    """Return every match across all statuses."""
    return store.list_matches()


@router.post("", response_model=Match, status_code=status.HTTP_201_CREATED)
def create_match(payload: CreateMatchInput) -> Match:
    """Schedule a match between two existing teams."""
    if payload.home_team_id == payload.away_team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A team cannot play itself.",
        )
    if (
        store.get_team(payload.home_team_id) is None
        or store.get_team(payload.away_team_id) is None
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unknown team selected.",
        )
    return store.create_match(
        payload.home_team_id, payload.away_team_id, payload.scheduled_at
    )


@router.patch("/{match_id}/score", response_model=Match)
def update_score(match_id: str, payload: UpdateScoreInput) -> Match:
    """Overwrite both scores on a live or completed match."""
    match = _require_match(match_id)
    if match.status == MatchStatus.scheduled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start the match before entering scores.",
        )
    return store.update_match(
        match_id, home_score=payload.home_score, away_score=payload.away_score
    )


@router.post("/{match_id}/start", response_model=Match)
def start_match(match_id: str) -> Match:
    """Transition a scheduled match to live."""
    match = _require_match(match_id)
    if match.status != MatchStatus.scheduled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only a scheduled match can be started.",
        )
    return store.update_match(match_id, status=MatchStatus.live)


@router.post("/{match_id}/complete", response_model=Match)
def complete_match(match_id: str) -> Match:
    """Transition a live match to completed."""
    match = _require_match(match_id)
    if match.status != MatchStatus.live:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only a live match can be completed.",
        )
    if match.home_score == match.away_score:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Matches cannot end in a draw. Adjust the score first.",
        )
    return store.update_match(match_id, status=MatchStatus.completed)
