from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db.db import init_pool, close_pool
from app.api.documents import router as documents_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()


app = FastAPI(title="chat-wiki", lifespan=lifespan)
app.include_router(documents_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
