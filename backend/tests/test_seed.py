"""Seed data and app startup behaviour."""

from __future__ import annotations

from app.seed import DEMO_PASSWORD, DEMO_USERNAME, seed_store
from app.store import Store


def test_seed_store_is_idempotent():
    store = Store()
    seed_store(store)
    team_count = len(store.list_teams())

    seed_store(store)  # should not duplicate

    assert len(store.list_teams()) == team_count
    assert len(store.list_matches()) == 4
    assert store.has_user(DEMO_USERNAME)
    assert store.get_user(DEMO_USERNAME).public().username == DEMO_USERNAME
    # The demo password is stored hashed, never in plaintext.
    assert DEMO_PASSWORD not in store.get_user(DEMO_USERNAME).password_hash
