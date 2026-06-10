import threading

from app.config import settings


class EmbeddingService:
    """Self-hosted BAAI/bge-m3 dense embeddings, shared by query and ingestion.

    The model is loaded lazily on first use (and kept as a process singleton) so
    importing this module does not require the heavy FlagEmbedding/torch stack.
    """

    def __init__(self) -> None:
        self._model = None
        self._lock = threading.Lock()

    def _get_model(self):
        if self._model is None:
            with self._lock:
                if self._model is None:
                    from FlagEmbedding import BGEM3FlagModel

                    self._model = BGEM3FlagModel(
                        settings.embedding_model,
                        use_fp16=settings.embedding_use_fp16,
                    )
        return self._model

    def warm(self) -> None:
        """Force-load the model, e.g. at process startup."""
        self._get_model()

    def encode_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        result = self._get_model().encode(
            texts,
            batch_size=settings.embedding_batch_size,
            max_length=settings.embedding_max_length,
            return_dense=True,
            return_sparse=False,
            return_colbert_vecs=False,
        )
        return [[float(value) for value in vector] for vector in result["dense_vecs"]]

    def encode_query(self, text: str) -> list[float]:
        return self.encode_documents([text])[0]


embedding_service = EmbeddingService()
