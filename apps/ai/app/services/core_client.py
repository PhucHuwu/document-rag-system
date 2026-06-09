from typing import Any

import httpx

from app.config import settings


class CoreClient:
    """Calls Core Backend internal ingestion callbacks. Core stays the source of
    truth for Postgres: the worker reports status / persists chunks via Core.
    """

    def __init__(self) -> None:
        self._base_url = settings.core_backend_url.rstrip("/")
        self._headers = {
            "content-type": "application/json",
            "x-internal-key": settings.internal_api_key,
        }

    def report_status(self, job_id: str, status: str) -> dict[str, Any]:
        return self._post(f"/internal/ingestion/{job_id}/status", {"status": status})

    def complete(self, job_id: str, chunks: list[dict[str, Any]]) -> dict[str, Any]:
        return self._post(f"/internal/ingestion/{job_id}/complete", {"chunks": chunks})

    def fail(self, job_id: str, error: str) -> dict[str, Any]:
        return self._post(f"/internal/ingestion/{job_id}/fail", {"error": error})

    def _post(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        with httpx.Client(timeout=30) as client:
            response = client.post(f"{self._base_url}{path}", headers=self._headers, json=body)
            response.raise_for_status()
            return response.json() if response.content else {}


core_client = CoreClient()
