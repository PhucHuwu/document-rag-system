from qdrant_client import QdrantClient
from qdrant_client.http import models as qm

from app.config import settings


class QdrantRepository:
    """Wraps the Qdrant client. AI Backend owns the vector store; every query
    must carry a mandatory scope filter (workspace_id + is_active + folder/doc).
    """

    def __init__(self) -> None:
        self._client = QdrantClient(url=settings.qdrant_url)
        self._collection = settings.qdrant_collection

    @property
    def client(self) -> QdrantClient:
        return self._client

    def ensure_collection(self) -> None:
        existing = {c.name for c in self._client.get_collections().collections}
        if self._collection not in existing:
            self._client.create_collection(
                collection_name=self._collection,
                vectors_config=qm.VectorParams(
                    size=settings.embedding_dim,
                    distance=qm.Distance.COSINE,
                ),
            )
        self._ensure_payload_indexes()

    def _ensure_payload_indexes(self) -> None:
        index_fields = {
            "workspace_id": qm.PayloadSchemaType.KEYWORD,
            "folder_id": qm.PayloadSchemaType.KEYWORD,
            "document_id": qm.PayloadSchemaType.KEYWORD,
            "is_active": qm.PayloadSchemaType.BOOL,
        }
        for field_name, field_schema in index_fields.items():
            try:
                self._client.create_payload_index(
                    collection_name=self._collection,
                    field_name=field_name,
                    field_schema=field_schema,
                )
            except Exception:
                # Index already exists; Qdrant raises on a duplicate create.
                pass

    @staticmethod
    def build_scope_filter(
        workspace_id: str,
        allowed_folder_ids: list[str] | None = None,
        allowed_document_ids: list[str] | None = None,
    ) -> qm.Filter:
        must: list[qm.Condition] = [
            qm.FieldCondition(key="workspace_id", match=qm.MatchValue(value=workspace_id)),
            qm.FieldCondition(key="is_active", match=qm.MatchValue(value=True)),
        ]
        if allowed_folder_ids:
            must.append(qm.FieldCondition(key="folder_id", match=qm.MatchAny(any=allowed_folder_ids)))
        if allowed_document_ids:
            must.append(qm.FieldCondition(key="document_id", match=qm.MatchAny(any=allowed_document_ids)))
        return qm.Filter(must=must)

    def upsert_chunks(self, points: list[qm.PointStruct]) -> None:
        if not points:
            return
        self._client.upsert(collection_name=self._collection, points=points, wait=True)

    def search(
        self,
        vector: list[float],
        query_filter: qm.Filter | None = None,
        limit: int = 40,
    ) -> list[qm.ScoredPoint]:
        return self._client.search(
            collection_name=self._collection,
            query_vector=vector,
            query_filter=query_filter,
            limit=limit,
            with_payload=True,
        )

    def deactivate_documents(self, document_ids: list[str]) -> None:
        if not document_ids:
            return
        self._client.set_payload(
            collection_name=self._collection,
            payload={"is_active": False},
            points=qm.FilterSelector(
                filter=qm.Filter(
                    must=[qm.FieldCondition(key="document_id", match=qm.MatchAny(any=document_ids))]
                )
            ),
            wait=True,
        )


qdrant_repository = QdrantRepository()
