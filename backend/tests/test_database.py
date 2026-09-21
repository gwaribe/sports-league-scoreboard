"""Database URL handling, including PostgreSQL driver selection."""

from __future__ import annotations

from app.database import _create_database_engine, normalize_database_url


def test_sqlite_url_is_unchanged():
    assert normalize_database_url("sqlite:///league.db") == "sqlite:///league.db"


def test_postgres_scheme_uses_psycopg_driver():
    assert (
        normalize_database_url("postgres://user:pass@host:5432/league")
        == "postgresql+psycopg://user:pass@host:5432/league"
    )


def test_postgresql_scheme_uses_psycopg_driver():
    assert (
        normalize_database_url("postgresql://user:pass@host/league")
        == "postgresql+psycopg://user:pass@host/league"
    )


def test_explicit_psycopg_url_is_unchanged():
    url = "postgresql+psycopg://user:pass@host/league"
    assert normalize_database_url(url) == url


def test_postgres_engine_uses_psycopg_dialect():
    engine = _create_database_engine("postgres://user:pass@localhost:5432/league")

    assert engine.dialect.name == "postgresql"
    assert engine.dialect.driver == "psycopg"


def test_sqlite_engine_uses_sqlite_dialect():
    engine = _create_database_engine("sqlite:///:memory:")

    assert engine.dialect.name == "sqlite"


def test_postgres_schema_uses_timezone_aware_timestamps():
    from sqlalchemy.dialects import postgresql
    from sqlalchemy.schema import CreateTable

    from app.entities import MatchRecord, TeamRecord

    team_ddl = str(
        CreateTable(TeamRecord.__table__).compile(dialect=postgresql.dialect())
    )
    match_ddl = str(
        CreateTable(MatchRecord.__table__).compile(dialect=postgresql.dialect())
    )

    assert "TIMESTAMP WITH TIME ZONE" in team_ddl
    assert "TIMESTAMP WITH TIME ZONE" in match_ddl


def test_postgres_schema_generates_identity_primary_keys():
    from sqlalchemy.dialects import postgresql
    from sqlalchemy.schema import CreateTable

    from app.entities import TeamRecord

    ddl = str(CreateTable(TeamRecord.__table__).compile(dialect=postgresql.dialect()))

    assert "SERIAL" in ddl or "GENERATED" in ddl
