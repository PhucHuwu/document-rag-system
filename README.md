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

4. Prepare Core Backend database:

```bash
pnpm --filter @tina/api prisma:generate
pnpm --filter @tina/api prisma:migrate --name init
pnpm --filter @tina/api prisma:seed
```

5. Run services:

```bash
pnpm dev
```

6. Run Python AI Backend separately:

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

## AI Provider

The default LLM provider is OpenRouter.

Set the following value in `.env` before enabling real LLM calls:

```text
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=openai/gpt-4.1-mini
```

Embedding can be self-hosted or provider-backed. The default placeholder model is `BAAI/bge-m3`.

## Demo Accounts

After running `prisma:seed`, use these accounts:

```text
owner@tina.local / 123456
hr@tina.local / 123456
it@tina.local / 123456
super@tina.local / 123456
```

Login:

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"hr@tina.local","password":"123456"}'
```

Chat with a bearer token:

```bash
curl -X POST http://localhost:3001/chat/messages \
  -H "content-type: application/json" \
  -H "authorization: Bearer <accessToken>" \
  -d '{"assistantId":"asst_hr","question":"Chính sách nghỉ phép thế nào?"}'
```

Upload a document:

```bash
curl -X POST http://localhost:3001/documents/upload \
  -H "authorization: Bearer <accessToken>" \
  -F "folderId=folder_hr_policy" \
  -F "title=Demo policy" \
  -F "file=@/path/to/document.pdf"
```

## Documentation

- `docs/project.md`: product and architecture overview.
- `docs/system-design.md`: RBAC and hierarchical access control.
- `docs/rag-pipeline.md`: production RAG pipeline.
