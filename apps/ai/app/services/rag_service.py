from typing import Any
from uuid import uuid4

from app.config import settings
from app.services.openrouter_client import OpenRouterClient


class RagService:
    def __init__(self) -> None:
        self.openrouter = OpenRouterClient()

    def query(self, request: Any) -> dict[str, Any]:
        qdrant_filter = self._build_qdrant_filter(request)
        trace_id = f"trace_{uuid4().hex}"

        answer = self._generate_answer(request)

        return {
            "answer": answer,
            "sources": [],
            "retrieval_trace_id": trace_id,
            "debug": {
                "collection": settings.qdrant_collection,
                "llm_provider": "openrouter",
                "llm_model": settings.llm_model,
                "embedding_model": settings.embedding_model,
                "openrouter_configured": self.openrouter.is_configured(),
                "qdrant_filter": qdrant_filter,
                "top_k": request.top_k,
                "rerank_top_n": request.rerank_top_n,
            },
        }

    def _generate_answer(self, request: Any) -> str:
        if not self.openrouter.is_configured():
            return (
                "Dev mode: AI Backend đã nhận câu hỏi và đã khóa retrieval scope từ Core Backend. "
                "Chưa cấu hình OPENROUTER_API_KEY nên chưa gọi LLM thật."
            )

        messages = [
            {
                "role": "system",
                "content": (
                    "Bạn là trợ lý AI nội bộ của Tina Chatbot. "
                    "Chỉ trả lời dựa trên context được cung cấp. "
                    "Nếu chưa có context tài liệu, hãy nói rõ rằng hệ thống chưa retrieval được tài liệu. "
                    "Không tự suy đoán dữ liệu nội bộ."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Hiện đây là bản dev chưa kết nối Qdrant retrieval thật. "
                    f"Câu hỏi của user: {request.question}"
                ),
            },
        ]

        try:
            return self.openrouter.complete(messages)
        except Exception as exc:
            return f"Không thể gọi OpenRouter trong bản dev: {exc}"

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
