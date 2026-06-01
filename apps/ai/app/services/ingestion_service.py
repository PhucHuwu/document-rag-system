class IngestionService:
    def run_once(self) -> None:
        print("AI Worker ready. Waiting for ingestion queue integration.")

    def process_document(self, document_id: str) -> dict[str, str]:
        # Production flow:
        # read file from MinIO -> Docling parse -> normalize -> segment -> chunk
        # -> embed -> upsert vectors and metadata into Qdrant.
        return {
            "document_id": document_id,
            "status": "not_implemented",
        }
