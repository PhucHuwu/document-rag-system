import logging

from app.config import settings

logger = logging.getLogger("tina.rerank")


class RerankService:
    """Reranks retrieved chunks via Cohere Rerank.

    Acts as a no-op (keeps vector order, truncated to top_n) when reranking is
    disabled or no COHERE_API_KEY is set, so the pipeline still works in dev.
    Documents are reranked in batches and merged by score, so it scales beyond
    a single Cohere request.
    """

    def __init__(self) -> None:
        self._client = None

    def is_enabled(self) -> bool:
        return settings.rerank_enabled and bool(settings.cohere_api_key)

    def _get_client(self):
        if self._client is None:
            import cohere

            self._client = cohere.ClientV2(api_key=settings.cohere_api_key)
        return self._client

    def rerank(self, query: str, documents: list[str], top_n: int) -> list[tuple[int, float]]:
        """Return [(original_index, score), ...] ordered best-first, length <= top_n."""
        if not documents:
            return []

        limit = max(1, min(top_n, len(documents)))

        if not self.is_enabled():
            return [(index, 0.0) for index in range(limit)]

        try:
            scored = self._rerank_batched(query, documents, limit)
        except Exception:
            logger.warning("Cohere rerank failed; falling back to vector order", exc_info=True)
            return [(index, 0.0) for index in range(limit)]

        scored.sort(key=lambda item: item[1], reverse=True)
        return scored[:limit]

    def _rerank_batched(self, query: str, documents: list[str], limit: int) -> list[tuple[int, float]]:
        client = self._get_client()
        batch_size = max(1, settings.rerank_batch_size)
        scored: list[tuple[int, float]] = []

        for start in range(0, len(documents), batch_size):
            batch = documents[start : start + batch_size]
            response = client.rerank(
                model=settings.reranker_model,
                query=query,
                documents=batch,
                top_n=min(limit, len(batch)),
                max_tokens_per_doc=settings.rerank_max_tokens_per_doc,
            )
            for result in response.results:
                scored.append((start + result.index, result.relevance_score))

        return scored


rerank_service = RerankService()
