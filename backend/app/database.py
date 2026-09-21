"""SQLAlchemy database configuration.

The connection URL comes from ``DATABASE_URL``. The default is SQLite so local
development and tests work without external infrastructure. PostgreSQL is
supported through the psycopg (v3) driver: bare ``postgres://`` and
``postgresql://`` URLs are normalised to ``postgresql+psycopg://`` so the driver
is explicit and hosting-provider URL formats keep working.
"""

from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

DEFAULT_DATABASE_URL = "sqlite:///league.db"


def normalize_database_url(database_url: str) -> str:
    """Return ``database_url`` with an explicit SQLAlchemy driver.

    Hosting providers commonly expose ``postgres://`` (Heroku-style) or plain
    ``postgresql://`` URLs; SQLAlchemy requires the driver to be spelled out.
    Both are mapped onto the psycopg (v3) driver, while every other URL
    (including SQLite and already-qualified ``postgresql+psycopg://`` URLs) is
    returned unchanged.
    """
    for prefix in ("postgres://", "postgresql://"):
        if database_url.startswith(prefix):
            return "postgresql+psycopg://" + database_url[len(prefix) :]
    return database_url


DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)


def _create_database_engine(database_url: str) -> Engine:
    url = normalize_database_url(database_url)
    engine_options: dict[str, object] = {"pool_pre_ping": True}
    if url.startswith("sqlite"):
        engine_options["connect_args"] = {"check_same_thread": False}
    return create_engine(url, **engine_options)


engine = _create_database_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, class_=Session)
