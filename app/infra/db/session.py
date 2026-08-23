"""Engine and session lifecycle.

One engine per process, created by the app factory and disposed on shutdown. The
session factory is exposed rather than a global session: a request-scoped session
that is committed once, at the end of the unit of work, is what keeps a partially
ingested run from being visible to a concurrent read.

`create_all` is used instead of Alembic. For a seven-day build with two tables
and no production data to preserve, a migration tool is ceremony; the tradeoff is
written down in the README's Known Limitations rather than hidden.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.infra.db.base import Base
from app.infra.db.models import CollectorRunRow, SignalRow  # noqa: F401 — registers tables


def create_engine(database_url: str, *, echo: bool = False) -> AsyncEngine:
    """Build the async engine.

    SQLite gets `check_same_thread=False` because the async driver hands
    connections between event-loop tasks, which the default guard rejects.
    """
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    return create_async_engine(database_url, echo=echo, future=True, connect_args=connect_args)


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    """Session factory with `expire_on_commit=False`.

    Expiring on commit would make every attribute read after a commit issue a new
    query — inside a background job that has already closed its scope, that raises
    instead of returning data.
    """
    return async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def create_schema(engine: AsyncEngine) -> None:
    """Create any missing tables. Safe to call on every startup."""
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)


async def drop_schema(engine: AsyncEngine) -> None:
    """Drop every table. Used only by tests and `python -m app.seed --reset`."""
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)


@asynccontextmanager
async def session_scope(
    factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[AsyncSession]:
    """A transactional scope for code outside a request — jobs, seeding, the CLI.

    Commits on success, rolls back on any exception. Background tasks need this
    because they have no FastAPI dependency to close their session for them.
    """
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except BaseException:
            await session.rollback()
            raise
