from fastapi import FastAPI

from app.routers.health import router as health_router
from app.routers.rag import router as rag_router


app = FastAPI(
    title="Tina AI Backend",
    description="Internal AI Backend for RAG, Docling parsing, Qdrant retrieval and LLM orchestration.",
    version="0.1.0",
)

app.include_router(health_router)
app.include_router(rag_router)
