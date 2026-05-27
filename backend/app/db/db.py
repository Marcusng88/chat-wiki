from contextlib import asynccontextmanager
from psycopg_pool import AsyncConnectionPool
from app.utils.config import settings

_pool: AsyncConnectionPool | None = None


async def _configure_conn(conn) -> None:
    # Disable auto-prepare: psycopg3 auto-prepares after 5 executions per connection.
    # With pooling, the prepared statement persists on the server but psycopg3's
    # in-memory tracker resets on pool checkout → DuplicatePreparedStatement.
    conn.prepare_threshold = None


async def init_pool() -> None:
    global _pool
    _pool = AsyncConnectionPool(conninfo=settings.database_url, open=False, configure=_configure_conn)
    await _pool.open()


async def close_pool() -> None:
    if _pool:
        await _pool.close()


@asynccontextmanager
async def get_conn():
    if _pool is None:
        raise RuntimeError("DB pool not initialized")
    async with _pool.connection() as conn:
        yield conn
