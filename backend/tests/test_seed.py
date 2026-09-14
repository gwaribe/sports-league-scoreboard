"""Seed data and idempotency."""

from __future__ import annotations

from app.seed import seed_store
from app.store import Store


def test_seed_store_is_idempotent():
    store = Store()
    store.reset()
    seed_store(store)
    team_count = len(store.list_teams())

    seed_store(store)  # should not duplicate

    assert len(store.list_teams()) == team_count
    assert len(store.list_matches()) == 4
