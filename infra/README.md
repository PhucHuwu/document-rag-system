# Infrastructure

Local infrastructure services:

- PostgreSQL for business data and audit logs.
- Redis for cache, rate limit and queues.
- MinIO for S3-compatible object storage.
- Qdrant for vector search.

Start local infrastructure:

```bash
pnpm infra:up
```

Stop local infrastructure:

```bash
pnpm infra:down
```
