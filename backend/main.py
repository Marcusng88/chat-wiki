import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI

logging.basicConfig(level=logging.INFO)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("watchfiles").setLevel(logging.WARNING)
from fastapi.middleware.cors import CORSMiddleware
from app.db.db import init_pool, close_pool
from app.api.chat import router as chat_router
from app.api.documents import router as documents_router
from app.api.resolve import router as resolve_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()


app = FastAPI(title="chat-wiki", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router)
app.include_router(chat_router)
app.include_router(resolve_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
