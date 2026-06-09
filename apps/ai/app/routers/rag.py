from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.services.rag_service import RagService


router = APIRouter(prefix="/rag", tags=["rag"])
rag_service = RagService()


def verify_internal_key(x_internal_key: str | None = Header(default=None)) -> None:
    """Reject direct/public calls: only Core Backend (with the shared key) may query."""
    if x_internal_key != settings.internal_api_key:
        raise HTTPException(status_code=401, detail="Invalid internal API key")


class RagQueryRequest(BaseModel):
    workspace_id: str
    user_id: str
    assistant_id: str
    question: str = Field(min_length=1)
    allowed_folder_ids: list[str] = Field(default_factory=list)
    allowed_document_ids: list[str] = Field(default_factory=list)
    top_k: int = Field(default=40, ge=1, le=50)
    rerank_top_n: int = Field(default=8, ge=1, le=10)


@router.post("/query", dependencies=[Depends(verify_internal_key)])
def query(request: RagQueryRequest):
    if not request.allowed_folder_ids and not request.allowed_document_ids:
        raise HTTPException(status_code=403, detail="Missing retrieval scope")

    return rag_service.query(request)
