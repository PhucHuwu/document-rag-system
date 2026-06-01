from typing import Any

import httpx

from app.config import settings


class OpenRouterClient:
    def is_configured(self) -> bool:
        return bool(settings.openrouter_api_key)

    def complete(self, messages: list[dict[str, str]], temperature: float = 0.2) -> str:
        if not self.is_configured():
            raise RuntimeError("OPENROUTER_API_KEY is not configured")

        payload: dict[str, Any] = {
            "model": settings.llm_model,
            "messages": messages,
            "temperature": temperature,
        }

        headers = {
            "authorization": f"Bearer {settings.openrouter_api_key}",
            "content-type": "application/json",
            "http-referer": settings.openrouter_site_url,
            "x-title": settings.openrouter_app_name,
        }

        with httpx.Client(timeout=60) as client:
            response = client.post(
                f"{settings.openrouter_base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        return data["choices"][0]["message"]["content"]
