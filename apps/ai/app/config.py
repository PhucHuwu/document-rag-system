from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ai_port: int = 8000
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "tina_chunks"
    embedding_model: str = "text-embedding-3-small"
    llm_model: str = "gpt-4.1-mini"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
