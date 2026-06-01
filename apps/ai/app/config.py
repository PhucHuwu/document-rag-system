from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ai_port: int = 8000
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "tina_chunks"
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_app_name: str = "Tina Chatbot"
    openrouter_site_url: str = "http://localhost:3000"
    embedding_model: str = "BAAI/bge-m3"
    llm_model: str = "openai/gpt-4.1-mini"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
