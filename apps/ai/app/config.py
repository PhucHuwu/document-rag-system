from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ai_port: int = 8000

    # Qdrant vector store
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "tina_chunks"

    # OpenRouter (LLM)
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_app_name: str = "Tina Chatbot"
    openrouter_site_url: str = "http://localhost:3000"
    llm_model: str = "openai/gpt-4.1-mini"

    # Embedding (self-hosted BAAI/bge-m3, dense)
    embedding_model: str = "BAAI/bge-m3"
    embedding_dim: int = 1024
    embedding_use_fp16: bool = True
    embedding_batch_size: int = 12
    embedding_max_length: int = 1024

    # Reranker (Cohere)
    cohere_api_key: str = ""
    reranker_model: str = "rerank-multilingual-v3.0"
    rerank_enabled: bool = True
    rerank_batch_size: int = 1000
    rerank_max_tokens_per_doc: int = 2048

    # Redis ingestion queue (Streams)
    redis_url: str = "redis://localhost:6379"
    redis_stream: str = "ingestion"
    redis_group: str = "ingestion-workers"
    redis_consumer: str = "worker-1"
    max_ingestion_attempts: int = 3

    # MinIO object storage
    minio_endpoint: str = "localhost"
    minio_port: int = 9000
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "tina-documents"
    minio_secure: bool = False

    # Core Backend callbacks + internal auth
    core_backend_url: str = "http://localhost:3001"
    internal_api_key: str = "change-me-internal-key"

    # Chunking + retrieval
    chunk_size: int = 800
    chunk_overlap: int = 120
    retrieval_min_score: float | None = None
    max_context_tokens: int = 6000

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
