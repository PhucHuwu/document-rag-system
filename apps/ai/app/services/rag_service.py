from typing import Any
from uuid import uuid4

from app.config import settings


class RagService:
    def query(self, request: Any) -> dict[str, Any]:
        qdrant_filter = self._build_qdrant_filter(request)

        # Placeholder implementation. Production flow:
        # query rewrite -> embedding -> Qdrant filtered retrieval -> post-validation
        # -> rerank -> context assembly -> guarded prompt -> LLM generation.
        return {
            "answer": "AI Backend đã nhận câu hỏi. RAG retrieval sẽ chỉ chạy trong scope được Core Backend cấp.",
            "sources": [],
            "retrieval_trace_id": f"trace_{uuid4().hex}",
            "debug": {
                "collection": settings.qdrant_collection,
                "llm_provider": "openrouter",
                "llm_model": settings.llm_model,
                "embedding_model": settings.embedding_model,
                "qdrant_filter": qdrant_filter,
                "top_k": request.top_k,
                "rerank_top_n": request.rerank_top_n,
            },
        }

    def _build_qdrant_filter(self, request: Any) -> dict[str, Any]:
        must: list[dict[str, Any]] = [
            {"key": "workspace_id", "match": {"value": request.workspace_id}},
            {"key": "is_active", "match": {"value": True}},
        ]

        if request.allowed_folder_ids:
            must.append({"key": "folder_id", "match": {"any": request.allowed_folder_ids}})

        if request.allowed_document_ids:
            must.append({"key": "document_id", "match": {"any": request.allowed_document_ids}})

        return {"must": must}
