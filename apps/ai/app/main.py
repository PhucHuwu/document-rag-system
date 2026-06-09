import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routers.health import router as health_router
from app.routers.rag import router as rag_router
from app.services.embedding_service import embedding_service
from app.services.qdrant_repository import qdrant_repository

logger = logging.getLogger("tina.ai")


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Best-effort startup: ensure the Qdrant collection exists and warm the
    # embedding model. Failures are logged but do not block boot (health stays up);
    # the model also loads lazily on first query if warm-up is skipped.
    try:
        qdrant_repository.ensure_collection()
    except Exception:
        logger.exception("Qdrant ensure_collection failed at startup")

    try:
        embedding_service.warm()
    except Exception:
        logger.exception("Embedding model warm-up failed at startup")

    yield


app = FastAPI(
    title="Tina AI Backend",
    description="Internal AI Backend for RAG, Docling parsing, Qdrant retrieval and LLM orchestration.",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(health_router)
app.include_router(rag_router)
