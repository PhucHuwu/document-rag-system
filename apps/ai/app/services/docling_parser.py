import logging
import re
import unicodedata
from io import BytesIO
from typing import Any

from app.config import settings

logger = logging.getLogger("tina.docling")

MIN_CHUNK_CHARS = 10


class DoclingParser:
    """Parses a document with Docling and produces structure-aware chunks.

    Heavy Docling imports are deferred so the module can be imported without the
    docling/torch stack installed.
    """

    def __init__(self) -> None:
        self._converter = None
        self._chunker = None

    def _get_converter(self):
        if self._converter is None:
            from docling.document_converter import DocumentConverter

            self._converter = DocumentConverter()
        return self._converter

    def _get_chunker(self):
        if self._chunker is None:
            from docling.chunking import HybridChunker

            self._chunker = HybridChunker(
                tokenizer=settings.embedding_model,
                max_tokens=settings.chunk_size,
                merge_peers=True,
            )
        return self._chunker

    def parse(self, file_bytes: bytes, file_name: str):
        from docling.datamodel.base_models import DocumentStream

        source = DocumentStream(name=file_name, stream=BytesIO(file_bytes))
        result = self._get_converter().convert(source)
        return result.document

    def chunk(self, dl_doc) -> list[dict[str, Any]]:
        """Return normalized, structure-aware chunks with citation metadata."""
        chunks: list[dict[str, Any]] = []
        for raw_chunk in self._get_chunker().chunk(dl_doc=dl_doc):
            content = self._normalize(getattr(raw_chunk, "text", "") or "")
            if len(content) < MIN_CHUNK_CHARS:
                continue

            headings = list(getattr(raw_chunk.meta, "headings", None) or [])
            page_start, page_end = self._extract_pages(raw_chunk)
            chunks.append(
                {
                    "content": content,
                    "section_title": headings[-1] if headings else None,
                    "heading_path": headings,
                    "page_start": page_start,
                    "page_end": page_end,
                    "content_type": "text",
                }
            )
        return chunks

    @staticmethod
    def build_embed_text(document_title: str | None, chunk: dict[str, Any]) -> str:
        """Prepend a short context prefix to improve embedding quality (rag-pipeline §4.6)."""
        lines: list[str] = []
        if document_title:
            lines.append(f"Tài liệu: {document_title}")
        if chunk.get("heading_path"):
            lines.append("Mục: " + " > ".join(chunk["heading_path"]))
        if chunk.get("page_start") is not None:
            lines.append(f"Trang: {chunk['page_start']}")

        prefix = "\n".join(lines)
        return f"{prefix}\n\n{chunk['content']}" if prefix else chunk["content"]

    @staticmethod
    def _normalize(text: str) -> str:
        text = unicodedata.normalize("NFC", text)
        text = text.replace(" ", " ")
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    @staticmethod
    def _extract_pages(raw_chunk) -> tuple[int | None, int | None]:
        pages: list[int] = []
        for item in getattr(raw_chunk.meta, "doc_items", None) or []:
            for prov in getattr(item, "prov", None) or []:
                page_no = getattr(prov, "page_no", None)
                if page_no is not None:
                    pages.append(page_no)
        if not pages:
            return None, None
        return min(pages), max(pages)


docling_parser = DoclingParser()
