from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.rag_service import RagService


router = APIRouter(prefix="/rag", tags=["rag"])
rag_service = RagService()


class RagQueryRequest(BaseModel):
    workspace_id: str
    user_id: str
    assistant_id: str
    question: str = Field(min_length=1)
    allowed_folder_ids: list[str] = Field(default_factory=list)
    allowed_document_ids: list[str] = Field(default_factory=list)
    top_k: int = Field(default=40, ge=1, le=50)
    rerank_top_n: int = Field(default=8, ge=1, le=10)


@router.post("/query")
def query(request: RagQueryRequest):
    if not request.allowed_folder_ids and not request.allowed_document_ids:
        raise HTTPException(status_code=403, detail="Missing retrieval scope")

    return rag_service.query(request)
