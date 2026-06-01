from fastapi import APIRouter


router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def health() -> dict[str, str]:
    return {"service": "tina-ai-backend", "status": "ok"}
