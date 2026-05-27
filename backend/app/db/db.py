from contextlib import asynccontextmanager
from psycopg_pool import AsyncConnectionPool
from app.utils.config import settings

_pool: AsyncConnectionPool | None = None


async def init_pool() -> None:
    global _pool
    _pool = AsyncConnectionPool(conninfo=settings.database_url, open=False)
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
