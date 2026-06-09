# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`document-rag-system` (package name `tina-chatbot`) is a multi-tenant RAG chatbot platform. It is a pnpm + Docker monorepo with three apps:

- `apps/web` — Next.js 15 / React 19 client. The **only** thing the browser is allowed to call is Core Backend.
- `apps/api` — NestJS "Core Backend" (`@tina/api`). Public HTTP API, owner of Postgres (via Prisma), and the **source of truth for permissions/access scope**.
- `apps/ai` — Python FastAPI "AI Backend" + a separate ingestion worker (same image, different command). Does Docling parsing, embedding, Qdrant retrieval, reranking, and LLM calls. It is internal-only.

`infra/` + `docker-compose.yml` provide Postgres, Redis, MinIO (S3-compatible object store), and Qdrant (vector DB).

## Commands

Run from repo root unless noted. Package manager is **pnpm 9** (`pnpm@9.15.0`); Node services are filtered with `@tina/api` / `@tina/web`.

```bash
pnpm infra:up          # start postgres, redis, minio, qdrant (detached)
pnpm infra:down

pnpm install
pnpm --filter @tina/api prisma:generate
pnpm --filter @tina/api prisma:migrate --name <migration>   # prisma migrate dev
pnpm --filter @tina/api prisma:seed                         # tsx prisma/seed.ts

pnpm dev               # runs all workspace `dev` scripts in parallel
pnpm dev:api           # NestJS only (nest start --watch)
pnpm dev:web           # Next.js only

pnpm build             # pnpm -r build
pnpm lint              # pnpm -r lint
pnpm typecheck         # pnpm -r typecheck (tsc --noEmit per package)
```

The Python AI Backend is **not** part of the pnpm workspace — run it separately:

```bash
cd apps/ai
python -m venv .venv && .\.venv\Scripts\Activate.ps1   # PowerShell on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000              # API
python -m app.worker                                   # ingestion worker (separate process)
```

Or run the whole stack: `docker compose up --build`.

There is **no test suite** in the repo yet (no test runner configured in any package). "Verifying" a change means running the relevant service and exercising it via curl (see README for login / chat / upload examples).

### Service URLs
Web `:3000` · Core Backend `:3001` · AI Backend `:8000` · Qdrant `:6333` · MinIO API `:9000` / console `:9001` · Postgres `:5432` · Redis `:6379`.

## Architecture & invariants

### Security boundary (do not break this)
The trust chain is strictly linear:

```
Client → Core Backend → AI Backend → Qdrant/MinIO
```

The client must never call AI Backend, Qdrant, or MinIO directly. AI Backend and the worker authenticate to/from Core Backend with a shared secret `INTERNAL_API_KEY` (header `x-internal-key`, enforced by `InternalAuthGuard` and on AI's `/rag/query`). The browser uses JWT bearer auth (`JwtAuthGuard` + `@nestjs/passport`); endpoint authorization uses `PermissionsGuard` + `@RequirePermissions(...)` against the static role→permission map in [apps/api/src/modules/rbac/permissions.ts](apps/api/src/modules/rbac/permissions.ts).

### Access-scope model (the core domain logic)
Every RAG query is restricted to an **effective folder scope**, computed by Core Backend, never trusted from the client:

```
effective_scope = user_folder_scope ∩ assistant_folder_scope   (folder trees, expanded to descendants)
```

This is implemented in [apps/api/src/modules/dev-data/dev-data.service.ts](apps/api/src/modules/dev-data/dev-data.service.ts):
- `getUserFolderScope` — folders the user has `read` access to via `FolderAccessControl`, expanded to all descendant folders.
- `getAssistantFolderScope` — the assistant's knowledge-source folders, expanded to descendants.
- `getEffectiveFolderScope` — intersection of the two; returns `[]` (→ query denied) unless the user and assistant are both `active`, in the same workspace, **and** an `AssistantAssignment` links them.

If `effectiveScope` is empty, the chat request is rejected with `ForbiddenException` before ever reaching AI Backend.

**Defense in depth:** AI Backend does not just trust the scope. `RagService` (in [apps/ai/app/services/rag_service.py](apps/ai/app/services/rag_service.py)) (1) builds a **mandatory** Qdrant filter from `workspace_id` + `allowed_folder_ids` + `allowed_document_ids`, then (2) re-validates every returned chunk against workspace, `is_active`, and the allowed folder/doc sets, dropping anything out of scope. Chunk payloads in Qdrant carry `workspace_id`, `folder_id`, `document_id`, `is_active` precisely so this filter+revalidate can happen.

> Note: scope/data access currently lives in a module literally named `dev-data` — this is the working source of truth for the dev backend, not throwaway code. Treat it as the authoritative scope logic.

### Chat / query flow
`POST /chat/messages` → `ChatService.sendMessage` ([apps/api/src/modules/chat/chat.service.ts](apps/api/src/modules/chat/chat.service.ts)): authorize → compute scopes → persist user `ChatMessage` → `POST {AI_BACKEND_URL}/rag/query` with the effective scope and assistant's `topK`/`rerankTopN` → persist assistant message + a `RetrievalTrace` (records both scopes, the Qdrant filter, retrieved chunk ids, latency — this is the audit trail). The JSON shape returned by AI's `/rag/query` (`answer`, `sources`, `retrieval_trace_id`, `debug{...}`) is a contract consumed here; changing one side requires changing the other.

### Ingestion flow (async, via Redis Streams)
1. `POST /documents/upload` ([apps/api/src/modules/documents/documents.service.ts](apps/api/src/modules/documents/documents.service.ts)): store file in MinIO, create `Document` + `IngestionJob` + `AuditLog` in one Prisma transaction (new uploads of the same filename bump `version` and mark prior versions `isActive: false`), then enqueue.
2. `QueueService.enqueueIngestion` ([apps/api/src/modules/queue/queue.service.ts](apps/api/src/modules/queue/queue.service.ts)) `XADD`s a JSON `payload` to the Redis stream `ingestion`.
3. The Python worker's `QueueConsumer` ([apps/ai/app/services/queue_consumer.py](apps/ai/app/services/queue_consumer.py)) reads it with a consumer group. **At-least-once**: a message is `XACK`'d only after success; failures stay pending and are retried via `XAUTOCLAIM` up to `max_ingestion_attempts` (default 3), then dead-lettered (reported failed + acked).
4. `IngestionService.process_job` ([apps/ai/app/services/ingestion_service.py](apps/ai/app/services/ingestion_service.py)): download → Docling parse → chunk → embed → upsert to Qdrant → deactivate superseded document versions → `POST` chunk metadata back to Core via the internal `internal/ingestion/:jobId/{status,complete,fail}` callbacks ([apps/api/src/modules/internal/internal.controller.ts](apps/api/src/modules/internal/internal.controller.ts)). It re-raises on failure so the consumer can retry/dead-letter.

### AI Backend service layout
Each external dependency is a singleton service module in `apps/ai/app/services/` (`embedding_service`, `qdrant_repository`, `rerank_service`, `openrouter_client`, `storage_client`, `core_client`, `docling_parser`). Both `main.py` (API) and `worker.py` warm the embedding model and `ensure_collection()` on startup, but **best-effort** — failures are logged, not fatal; the model also loads lazily on first use.

## Conventions & gotchas

- **Config:** Core Backend reads env via `@nestjs/config`; AI Backend via `pydantic-settings` ([apps/ai/app/config.py](apps/ai/app/config.py), reads `.env`, `extra="ignore"`). Both share the same `.env` at repo root — keep `.env.example` in sync when adding settings.
- **LLM provider is OpenRouter** (OpenAI-compatible), default `LLM_MODEL=openai/gpt-4.1-mini`. If `OPENROUTER_API_KEY` is unset, `RagService` returns a "dev mode" answer that previews retrieved context instead of calling an LLM — useful for testing retrieval without a key.
- **Embeddings** default to self-hosted `BAAI/bge-m3` (dim 1024); the Qdrant collection vector size must match `EMBEDDING_DIM`. **Reranking** uses Cohere and is disabled when `COHERE_API_KEY` is empty.
- **Language:** product is Vietnamese-first — system prompts, the `NO_ANSWER` sentinel, and many user-facing strings are in Vietnamese; chunk payloads set `language: "vi"`.
- **Prompt-injection guardrail:** the RAG system prompt explicitly instructs the model to treat CONTEXT as data, not instructions. Preserve that framing if you touch prompt assembly.
- IDs are human-readable prefixed strings in seed/demo data (`asst_hr`, `doc_<uuid>`, `folder_hr_policy`), generated as `doc_${uuid}` etc. in code.
- Platform-level users (no `workspaceId`) cannot chat in this dev backend.

## Reference docs
`docs/` holds the design + implementation write-ups: `ai-rag-implementation-plan.md`, `ai-rag-implementation-report.md`, `gap-analysis.md`, plus `project.md`, `system-design.md`, `rag-pipeline.md` (the RAG service code references `rag-pipeline §5.x` sections).
