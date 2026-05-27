from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db.db import init_pool, close_pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()


app = FastAPI(title="chat-wiki", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok"}
