from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # API
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # Triton (Embedding) — MUST be set via .env
    TRITON_HOST: str = ""
    TRITON_PORT: str = "31831"
    TRITON_BATCH_SIZE: int = 32
    TRITON_MODEL_NAME: str = "my_onnx_model"
    TOKENIZER_NAME: str = "BAAI/bge-m3"

    # Qdrant — MUST be set via .env
    QDRANT_URL: str = ""
    QDRANT_API_KEY: str = ""
    QDRANT_ON_DISK: bool = True

    # LLM (VNPT self-host, openai-compatible) — MUST be set via .env
    LLM_BASE_URL: str = ""
    LLM_API_KEY: str = ""
    LLM_MODEL_SMALL: str = "llm-small-v4"
    LLM_MODEL_MEDIUM: str = "llm-medium-v4"

    # Marker Cloud API
    DATALAB_API_KEY: str = ""

    # MinIO — MUST be set via .env
    MINIO_SERVICE_URL: str = ""
    MINIO_ACCESS_KEY: str = ""
    MINIO_SECRET_KEY: str = ""
    MINIO_FOLDER_NAME: str = "smartbot-v2"
    MINIO_PUBLIC_HOST: str = ""
    MINIO_EXPIRE_TIME: int = 168

    # Redis (for Celery)
    REDIS_URL: str = "redis://localhost:6379/1"

    # Web Backend callback URL
    WEB_BACKEND_URL: str = "http://localhost:3000"
    WEB_BACKEND_INTERNAL_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
