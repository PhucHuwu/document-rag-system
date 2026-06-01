# Qdrant

Qdrant stores document chunk embeddings and metadata payloads.

Default collection:

```text
tina_chunks
```

Every retrieval query must include metadata filters for:

```text
workspace_id
folder_id or document_id
is_active
```

AI Backend must reject retrieval requests without an explicit scope from Core Backend.
