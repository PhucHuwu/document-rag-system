# Core Backend

NestJS Core Backend is the public server in the client-server architecture.

Responsibilities:

- Authentication and session handling.
- Workspace, user, role and permission management.
- Folder tree and hierarchical access control.
- Document metadata and ingestion job creation.
- Assistant configuration and assistant knowledge source management.
- Chat session and message persistence.
- Retrieval scope calculation before calling AI Backend.
- Audit log and retrieval trace persistence.

Dev database setup:

```bash
pnpm --filter @tina/api prisma:generate
pnpm --filter @tina/api prisma:migrate --name init
pnpm --filter @tina/api prisma:seed
```

Demo login:

```text
hr@tina.local / Password123!
```

Core rule:

```text
Core Backend computes effective_scope.
AI Backend must not decide permissions.
```

Planned modules:

- `auth`
- `workspaces`
- `users`
- `roles`
- `folders`
- `documents`
- `assistants`
- `chat`
- `audit-logs`
- `retrieval-traces`
