"""
FastAPI dependency injection — lazy singleton service instances.

Services are created on first access (not at import time) so the app
can start even when Triton/Qdrant/MinIO are temporarily unreachable.
"""

import threading

from app.config import settings
from app.core.qdrant_handler import QdrantHandler
from app.core.triton_client import TritonClient
from app.services.chunker import Chunker
from app.services.embedding_service import EmbeddingService
from app.services.query_rewriter import QueryRewriter
from app.services.rag_chat import RAGChat
from app.services.storage import StorageService
from app.services.text_extractor import TextExtractor

_lock = threading.RLock()
_instances: dict = {}


def _get_or_create(key: str, factory):
    """Thread-safe lazy singleton factory."""
    if key not in _instances:
        with _lock:
            if key not in _instances:
                _instances[key] = factory()
    return _instances[key]


def get_triton_client() -> TritonClient:
    return _get_or_create("triton", lambda: TritonClient(app_settings=settings))


def get_qdrant_handler() -> QdrantHandler:
    return _get_or_create("qdrant", lambda: QdrantHandler(app_settings=settings))


def get_storage_service() -> StorageService:
    return _get_or_create("storage", lambda: StorageService(app_settings=settings))


def get_text_extractor() -> TextExtractor:
    return _get_or_create(
        "extractor",
        lambda: TextExtractor(storage=get_storage_service(), app_settings=settings),
    )


def get_chunker() -> Chunker:
    return _get_or_create("chunker", Chunker)


def get_embedding_service() -> EmbeddingService:
    return _get_or_create(
        "embedding",
        lambda: EmbeddingService(triton=get_triton_client(), qdrant=get_qdrant_handler()),
    )


def get_query_rewriter() -> QueryRewriter:
    return _get_or_create(
        "rewriter", lambda: QueryRewriter(app_settings=settings)
    )


def get_rag_chat() -> RAGChat:
    return _get_or_create(
        "rag_chat",
        lambda: RAGChat(
            embedding_service=get_embedding_service(),
            query_rewriter=get_query_rewriter(),
            app_settings=settings,
        ),
    )
