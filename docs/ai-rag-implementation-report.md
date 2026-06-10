# Báo cáo triển khai: AI Backend & RAG Pipeline (Phần 1)

> Ghi lại những gì đã thực hiện theo [ai-rag-implementation-plan.md](ai-rag-implementation-plan.md) (giải quyết mục 1 trong [gap-analysis.md](gap-analysis.md)).
> Phạm vi: Milestone **M0 → M4**. Trạng thái: **code-complete**, đã kiểm cú pháp; chưa cài deps/chạy runtime.

## 1. Tổng quan

Trước đây `apps/ai` chỉ là khung: `ingestion_service` trả `not_implemented`, `rag_service.query` trả `sources: []`; tài liệu upload xong nằm yên ở `IngestionJob(pending)`. Sau Phần 1, hệ thống đã có **đủ code** cho:

- **Ingestion**: Upload → MinIO → Redis Stream → Worker (Docling → normalize → chunk → embed bge-m3 → upsert Qdrant) → callback Core lưu `DocumentChunk`.
- **Query**: Core tính effective scope → AI embed câu hỏi → Qdrant filtered search → post-retrieval validation → Cohere rerank → context assembly → guardrailed LLM → answer + sources.
- **Bảo mật biên**: client chỉ gọi Core; AI nhận scope đã khóa; `/rag/query` và callback nội bộ được bảo vệ bằng `INTERNAL_API_KEY`; "không có scope thì deny".

## 2. Quyết định kiến trúc đã chốt

| Hạng mục | Lựa chọn |
|---|---|
| Ingestion trigger | Redis **Streams** + consumer group + worker process riêng (`python -m app.worker`) |
| Embedding | Self-host **BAAI/bge-m3** (FlagEmbedding, dense 1024-dim, cosine), dùng chung query + ingestion |
| Reranker | **Cohere Rerank API** (`rerank-multilingual-v3.0`), no-op nếu không có key |
| Sở hữu Postgres | Worker **không** ghi Postgres trực tiếp → callback Core; Core là source of truth |
| MinIO | Worker đọc file gốc trực tiếp từ MinIO (boto3) theo `storageKey` |
| Internal auth | `INTERNAL_API_KEY` (shared secret) 2 chiều Core ↔ AI |

## 3. Luồng đã hiện thực

```
INGESTION
Core.upload -> MinIO + Document + IngestionJob(pending) -> XADD stream "ingestion"
Worker XREADGROUP -> status(processing)
       -> MinIO download -> Docling parse -> normalize -> HybridChunker
       -> bge-m3 embed -> Qdrant upsert (payload + is_active=true)
       -> deactivate_documents(supersedes) trong Qdrant
       -> callback /complete { chunks[] } -> Core lưu DocumentChunk + status=completed -> XACK
       (lỗi -> không ack -> XAUTOCLAIM retry; quá max_attempts -> /fail + dead-letter)

QUERY
Core.chat.sendMessage -> effective_scope -> POST /rag/query (x-internal-key)
AI: embed câu hỏi -> Qdrant search(filter bắt buộc) -> post-validate (§5.7)
    -> Cohere rerank -> dedupe + token-budget context (§5.9) -> guardrail prompt (§5.10)
    -> OpenRouter LLM -> { answer, sources[], debug{...} } -> Core lưu ChatMessage + RetrievalTrace
```

## 4. Chi tiết theo Milestone

### M0 — Nền tảng dùng chung

| File | Loại | Nội dung |
|---|---|---|
| `apps/ai/app/services/embedding_service.py` | mới | Singleton bge-m3 (FlagEmbedding), lazy-load; `encode_documents/encode_query/warm` |
| `apps/ai/app/services/qdrant_repository.py` | mới | `ensure_collection` (1024/cosine + payload index), `upsert_chunks`, `search`, `deactivate_documents`, `build_scope_filter` |
| `apps/ai/app/services/storage_client.py` | mới | Tải file MinIO theo `storageKey` (boto3, path-style) |
| `apps/ai/app/services/core_client.py` | mới | Callback Core: `report_status` / `complete` / `fail` (header `x-internal-key`) |
| `apps/api/src/modules/internal/internal-auth.guard.ts` | mới | Guard so khớp `x-internal-key` với `INTERNAL_API_KEY` |
| `apps/ai/requirements.txt` | sửa | +`redis`, `FlagEmbedding`, `cohere`, `boto3` |
| `apps/ai/app/config.py` | sửa | Toàn bộ settings M0 (embedding, reranker, redis, minio, core callback, internal key, chunking) |
| `apps/api/src/modules/chat/chat.service.ts` | sửa | Gửi `x-internal-key` khi gọi `/rag/query` |
| `apps/ai/app/routers/rag.py` | sửa | `verify_internal_key` bắt buộc cho `/rag/query` (chặn gọi trực tiếp) |

### M1 — Query pipeline

| File | Loại | Nội dung |
|---|---|---|
| `apps/ai/app/services/rerank_service.py` | mới | Cohere rerank, fallback giữ thứ tự vector khi tắt/thiếu key/lỗi |
| `apps/ai/app/services/rag_service.py` | sửa | Pipeline thật: embed → search → **post-validate (§5.7)** → rerank → context (§5.9) → guardrail (§5.10) → LLM; trả `sources` + `debug` tương thích `chat.service.ts` |
| `apps/ai/app/main.py` | sửa | `lifespan` startup: `ensure_collection()` + `warm()` (best-effort) |

### M2 — Ingestion worker + queue + callbacks

| File | Loại | Nội dung |
|---|---|---|
| `apps/ai/app/services/docling_parser.py` | mới | `parse` (DocumentStream), `chunk` (HybridChunker, tokenizer bge-m3), normalize NFC/whitespace, trích page, `build_embed_text` prefix (§4.6) |
| `apps/ai/app/services/queue_consumer.py` | mới | Redis Streams: group, `XREADGROUP`/`XACK`, `XAUTOCLAIM` retry, đếm `times_delivered`, dead-letter sau `max_ingestion_attempts` |
| `apps/ai/app/services/ingestion_service.py` | sửa | `process_job`: download→parse→chunk→embed→upsert(payload §4.7)→deactivate supersedes→`complete`; raise khi lỗi để consumer retry |
| `apps/ai/app/worker.py` | sửa | `ensure_collection` + `warm` + `queue_consumer.run()` |
| `apps/api/src/modules/queue/queue.service.ts` | mới | `enqueueIngestion` = `XADD` field `payload`(JSON), ioredis + handler lỗi |
| `apps/api/src/modules/queue/queue.module.ts` | mới | Provide/export `QueueService` |
| `apps/api/src/modules/internal/internal.controller.ts` | mới | `POST /internal/ingestion/:jobId/{status,complete,fail}` (guard nội bộ) |
| `apps/api/src/modules/internal/internal.service.ts` | mới | `complete` (transaction): tạo `DocumentChunk` + retire chunk version cũ + status; `updateStatus`/`fail` |
| `apps/api/src/modules/internal/internal.module.ts` | mới | Đăng ký controller + service |
| `apps/api/src/modules/documents/documents.service.ts` | sửa | Tính `supersedesDocumentIds` + `enqueueIngestion` sau commit |
| `apps/api/src/modules/documents/documents.module.ts` | sửa | Import `QueueModule` |
| `apps/api/src/modules/app.module.ts` | sửa | Đăng ký `InternalModule` |
| `apps/api/package.json` | sửa | +`ioredis` |
| `apps/api/src/main.ts` | sửa | `NestExpressApplication` + `useBodyParser("json", {limit:"25mb"})` (callback nhiều chunk) |

> Lưu ý: **không đổi Prisma schema** — `DocumentChunk`/`IngestionJob` đã có sẵn, nên không cần migration mới.

### M3 — Rerank chất lượng & guardrail

| File | Loại | Nội dung |
|---|---|---|
| `apps/ai/app/services/rerank_service.py` | sửa | **Batching + merge-by-score** + `max_tokens_per_doc` |
| `apps/ai/app/services/rag_service.py` | sửa | `_select_context_chunks`: **loại trùng** + **cắt theo token budget** + cap 8; guardrail nhiều lớp `[VAI TRÒ]/[QUY TẮC AN TOÀN]/[ĐỊNH DẠNG]`; hằng `NO_ANSWER` cho mọi nhánh context rỗng |
| `apps/ai/app/config.py` | sửa | +`rerank_batch_size`, `rerank_max_tokens_per_doc`, `max_context_tokens` |

### M4 — Hạ tầng & cấu hình

| File | Loại | Nội dung |
|---|---|---|
| `docker-compose.yml` | sửa | Service **`ai-worker`** (reuse image `tina-ai:local`, `command: python -m app.worker`); anchor `x-ai-env` dùng chung; volume `hf_cache` (không tải lại model); `api` thêm `INTERNAL_API_KEY` |
| `.env.example` | sửa | +`INTERNAL_API_KEY`, `CORE_BACKEND_URL`, `COHERE_API_KEY`, `EMBEDDING_DIM`, `CHUNK_SIZE`, `CHUNK_OVERLAP`; đặt `RERANKER_MODEL=rerank-multilingual-v3.0` |

## 5. Cấu hình / ENV chính

| ENV | Mặc định | Dùng ở |
|---|---|---|
| `INTERNAL_API_KEY` | `change-me-internal-key` | Core (guard + gọi AI) & AI (verify) — phải đặt thật ở production |
| `CORE_BACKEND_URL` | `http://localhost:3001` | AI worker gọi callback |
| `REDIS_URL` | `redis://localhost:6379` | Core (producer) & AI worker (consumer) |
| `QDRANT_URL` / `QDRANT_COLLECTION` | `http://localhost:6333` / `tina_chunks` | AI |
| `MINIO_*` | `localhost:9000` / `minioadmin` / `tina-documents` | AI worker tải file |
| `EMBEDDING_MODEL` / `EMBEDDING_DIM` | `BAAI/bge-m3` / `1024` | AI |
| `COHERE_API_KEY` / `RERANKER_MODEL` | rỗng / `rerank-multilingual-v3.0` | AI (trống ⇒ tắt rerank) |
| `OPENROUTER_API_KEY` / `LLM_MODEL` | rỗng / `openai/gpt-4.1-mini` | AI (trống ⇒ trả preview context) |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | `800` / `120` | AI worker chunking |

## 6. Hợp đồng API nội bộ

Callback (worker → Core, header `x-internal-key`):
- `POST /internal/ingestion/:jobId/status` — `{ status }` (1 trong enum `IngestionStatus`).
- `POST /internal/ingestion/:jobId/complete` — `{ chunks: [{ qdrant_point_id, content, section_title, heading_path, page_start, page_end }] }`.
- `POST /internal/ingestion/:jobId/fail` — `{ error }`.

`POST /rag/query` (Core → AI) trả: `answer`, `sources[]` (`document_id, document_title, page, section_title, chunk_id`), `retrieval_trace_id`, `debug{ qdrant_filter, retrieved_chunk_ids, reranked_chunk_ids, final_context_chunk_ids, llm_provider, llm_model, embedding_model, ... }`.

## 7. Kiểm thử đã chạy

| Kiểm tra | Kết quả |
|---|---|
| `python -m py_compile` toàn bộ file AI (M0–M3) | ✅ OK (Python 3.12.10) |
| `docker compose config -q` (M4) | ✅ OK — anchor + interpolation hợp lệ, đủ 8 service gồm `ai-worker` |
| TypeScript `tsc` (Core) | ⏳ **chưa chạy** — repo chưa `pnpm install` (không có `node_modules`/`ioredis`); đã rà tay |
| Runtime/import Python | ⏳ **chưa chạy** — deps chưa cài (FlagEmbedding/qdrant/cohere/boto3 MISSING) |

## 8. Cách chạy end-to-end

```bash
cp .env.example .env     # đặt OPENROUTER_API_KEY, COHERE_API_KEY (tùy chọn), INTERNAL_API_KEY (prod)

# Cách A — Docker (đủ stack, gồm ai-worker)
docker compose up --build
docker compose exec api sh -lc "pnpm prisma:migrate deploy && pnpm prisma:seed"

# Cách B — Dev local
pnpm infra:up
pnpm --filter @tina/api prisma:generate && pnpm --filter @tina/api prisma:migrate --name init && pnpm --filter @tina/api prisma:seed
pnpm dev:api
cd apps/ai && pip install -r requirements.txt
uvicorn app.main:app --port 8000          # API mode
python -m app.worker                       # Worker mode (tiến trình riêng)
```

Luồng nghiệm thu: login `hr@tina.local/123456` → `POST /documents/upload` (folder `folder_hr_policy`, 1 PDF) → poll `GET /documents/ingestion-jobs/:id` tới `completed` → kiểm `GET localhost:6333/collections/tina_chunks` có points → `POST /chat/messages` trả lời kèm `sources`.

Kiểm thử bảo mật (rag-pipeline §9): user không có quyền folder → effective_scope rỗng → deny; chunk ngoài scope bị post-validate loại; query thiếu `workspace_id`/scope → reject; document inactive/version cũ không retrieval; gọi thẳng `/rag/query` thiếu `x-internal-key` → 401.

## 9. Điểm cần soi ở lần chạy thật (không verify được khi chưa cài deps)

- **API Docling theo version** (`DocumentStream`, `HybridChunker(tokenizer=, max_tokens=)`, `chunk.meta.headings/doc_items[].prov[].page_no`) — đã viết phòng thủ bằng `getattr`, nhưng nên kiểm khi chạy.
- **Chữ ký SDK**: `BGEM3FlagModel.encode(...)["dense_vecs"]`; `cohere.ClientV2.rerank(..., max_tokens_per_doc=...)` (nếu version không nhận kwarg → `try/except` tự degrade về thứ tự vector, không crash).
- **redis-py** `xautoclaim` (đã xử lý theo độ dài trả về), `ioredis.xadd`, Nest `useBodyParser` (có ở 10.4).
- **RAM**: bge-m3 + torch load ở cả `ai` lẫn `ai-worker` (tốn RAM); `hf_cache` giúp không tải lại model.

## 10. Ngoài phạm vi / việc còn lại

- Cài dependencies thật (`pip install` nặng + `pnpm install`) và nghiệm thu runtime end-to-end.
- **Test tự động** cho 11 ca bảo mật rag-pipeline §9 (thuộc Phần 11 trong gap-analysis).
- Cập nhật **root README** mục dev-local để nhắc chạy `python -m app.worker`.
- Các phần khác trong gap-analysis: Queue hardening/observability nâng cao (Phần 2/7), RBAC `system_prompt` (Phần 4), xóa/preview document (Phần 5), Web UI (Phần 9)...
