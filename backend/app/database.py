"""SQLAlchemy database configuration.

The connection URL comes from ``DATABASE_URL``. The default is SQLite so local
development and tests work without external infrastructure, while the SQLAlchemy
engine keeps the storage layer ready for other databases.
"""

from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///league.db")


def _create_database_engine(database_url: str) -> Engine:
    engine_options: dict[str, object] = {"pool_pre_ping": True}
    if database_url.startswith("sqlite"):
        engine_options["connect_args"] = {"check_same_thread": False}
    return create_engine(database_url, **engine_options)


engine = _create_database_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, class_=Session)
