# document-rag-system

document-rag-system is a multi-tenant RAG chatbot platform for enterprise knowledge assistants.

The architecture follows a client-server model:

- `apps/web`: Next.js client application.
- `apps/api`: NestJS Core Backend. This is the only public backend the client calls.
- `apps/ai`: Python AI Backend and AI Worker for RAG, Docling document parsing, embedding, retrieval and LLM calls.
- `infra`: local infrastructure with PostgreSQL, Redis, MinIO and Qdrant.

Core Backend is the source of truth for permission. AI Backend must only retrieve documents within the scope granted by Core Backend.

## Local Development

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Start infrastructure:

```bash
pnpm infra:up
```

3. Install Node dependencies:

```bash
pnpm install
```

4. Run services:

```bash
pnpm dev
```

5. Run Python AI Backend separately:

```bash
cd apps/ai
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Or run the whole stack with Docker Compose:

```bash
docker compose up --build
```

## Security Boundary

The client must only call Core Backend.

```text
Client -> Core Backend -> AI Backend -> Qdrant
```

The following calls are not allowed:

```text
Client -> AI Backend
Client -> Qdrant
Client -> MinIO
```

Every RAG query must use an effective retrieval scope computed by Core Backend:

```text
effective_scope = user_folder_scope ∩ assistant_folder_scope
```

If `effective_scope` is empty, Core Backend or AI Backend must deny the query.

## Service URLs

- Web: `http://localhost:3000`
- Core Backend: `http://localhost:3001`
- AI Backend: `http://localhost:8000`
- Qdrant: `http://localhost:6333`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

## Documentation

- `docs/project.md`: product and architecture overview.
- `docs/system-design.md`: RBAC and hierarchical access control.
- `docs/rag-pipeline.md`: production RAG pipeline.
