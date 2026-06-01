# AI Backend

Python AI Backend handles RAG and document processing.

Responsibilities:

- Docling document conversion.
- Content normalization.
- Structure-aware chunking.
- Embedding generation.
- Qdrant indexing and filtered retrieval.
- Reranking.
- Context assembly.
- Guarded prompt assembly.
- LLM calls through OpenRouter.

Security rule:

```text
AI Backend only retrieves inside the scope provided by Core Backend.
No scope means deny.
```

Runtime modes:

- API mode: `uvicorn app.main:app --reload --port 8000`
- Worker mode: `python -m app.worker`

AI provider:

```text
Provider: OpenRouter
Base URL: https://openrouter.ai/api/v1
API key env: OPENROUTER_API_KEY
Default LLM model: openai/gpt-4.1-mini
```
