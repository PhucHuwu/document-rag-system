import logging
from typing import Any
from uuid import uuid4

from qdrant_client.http import models as qm

from app.services.core_client import core_client
from app.services.docling_parser import docling_parser
from app.services.embedding_service import embedding_service
from app.services.qdrant_repository import qdrant_repository
from app.services.storage_client import storage_client

logger = logging.getLogger("tina.ingestion")


class IngestionService:
    """Processes one ingestion job end to end:
    download -> Docling parse -> normalize/chunk -> embed -> upsert Qdrant
    -> deactivate superseded versions -> report chunks back to Core.

    Raises on failure so the queue consumer can retry / dead-letter.
    """

    def process_job(self, job: dict[str, Any]) -> int:
        job_id = job["jobId"]

        self._report(job_id, "processing")
        file_bytes = storage_client.download(job["storageKey"])

        dl_doc = docling_parser.parse(file_bytes, job.get("fileName") or "document")
        self._report(job_id, "docling_parsed")

        parsed_chunks = docling_parser.chunk(dl_doc)
        self._report(job_id, "chunked")

        if not parsed_chunks:
            core_client.complete(job_id, [])
            logger.info("Job %s produced no chunks", job_id)
            return 0

        document_title = job.get("title") or job.get("fileName") or "document"
        embed_texts = [docling_parser.build_embed_text(document_title, chunk) for chunk in parsed_chunks]
        vectors = embedding_service.encode_documents(embed_texts)
        self._report(job_id, "embedded")

        points: list[qm.PointStruct] = []
        chunk_payloads: list[dict[str, Any]] = []
        for chunk, vector in zip(parsed_chunks, vectors):
            point_id = str(uuid4())
            points.append(
                qm.PointStruct(
                    id=point_id,
                    vector=vector,
                    payload={
                        "workspace_id": job["workspaceId"],
                        "folder_id": job["folderId"],
                        "document_id": job["documentId"],
                        "document_version": job.get("version", 1),
                        "chunk_id": point_id,
                        "document_title": document_title,
                        "section_title": chunk.get("section_title"),
                        "heading_path": chunk.get("heading_path") or [],
                        "page_start": chunk.get("page_start"),
                        "page_end": chunk.get("page_end"),
                        "content_type": chunk.get("content_type", "text"),
                        "content": chunk["content"],
                        "language": "vi",
                        "is_active": True,
                    },
                )
            )
            chunk_payloads.append(
                {
                    "qdrant_point_id": point_id,
                    "content": chunk["content"],
                    "section_title": chunk.get("section_title"),
                    "heading_path": chunk.get("heading_path") or [],
                    "page_start": chunk.get("page_start"),
                    "page_end": chunk.get("page_end"),
                }
            )

        qdrant_repository.upsert_chunks(points)
        self._report(job_id, "indexed")

        supersedes = job.get("supersedesDocumentIds") or []
        if supersedes:
            qdrant_repository.deactivate_documents(supersedes)

        core_client.complete(job_id, chunk_payloads)
        logger.info("Job %s indexed %s chunks", job_id, len(points))
        return len(points)

    @staticmethod
    def _report(job_id: str, status: str) -> None:
        try:
            core_client.report_status(job_id, status)
        except Exception:
            logger.warning("Status callback '%s' failed for job %s", status, job_id, exc_info=True)


ingestion_service = IngestionService()
