"""
Celery tasks for async document processing.

Services are lazily initialized on first task execution (not at import time)
to avoid failing the worker startup when infra is temporarily down.
"""

import asyncio
import threading

import structlog

from app.config import settings
from app.services.document_processor import DocumentProcessor
from app.worker.celery_app import celery_app

logger = structlog.get_logger()

_lock = threading.Lock()
_processor: DocumentProcessor | None = None


def _get_processor() -> DocumentProcessor:
    """Lazy singleton — created once per worker process."""
    global _processor
    if _processor is None:
        with _lock:
            if _processor is None:
                from app.core.qdrant_handler import QdrantHandler
                from app.core.triton_client import TritonClient
                from app.services.chunker import Chunker
                from app.services.embedding_service import EmbeddingService
                from app.services.storage import StorageService
                from app.services.text_extractor import TextExtractor

                storage = StorageService(app_settings=settings)
                triton = TritonClient(app_settings=settings)
                qdrant = QdrantHandler(app_settings=settings)
                extractor = TextExtractor(storage=storage, app_settings=settings)
                chunker = Chunker()
                embedding = EmbeddingService(triton=triton, qdrant=qdrant)
                _processor = DocumentProcessor(
                    extractor=extractor,
                    chunker=chunker,
                    embedding=embedding,
                    app_settings=settings,
                )
    return _processor


def _run_async(coro):
    """Run an async coroutine in a dedicated event loop.

    Uses a single shared loop per thread to avoid creating/destroying
    event loops on every task invocation.
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def process_document_task(self, **kwargs):
    """Async document processing task with retry."""
    try:
        logger.info("celery_process_start", document_id=kwargs.get("document_id"))
        processor = _get_processor()
        _run_async(processor.process(**kwargs))
        logger.info("celery_process_done", document_id=kwargs.get("document_id"))
    except Exception as exc:
        logger.error(
            "celery_process_failed",
            document_id=kwargs.get("document_id"),
            attempt=self.request.retries + 1,
            error=str(exc),
        )
        self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=2, default_retry_delay=15)
def reprocess_document_task(self, **kwargs):
    """Re-chunk from saved markdown with retry."""
    try:
        logger.info("celery_reprocess_start", document_id=kwargs.get("document_id"))
        processor = _get_processor()
        _run_async(processor.reprocess(**kwargs))
        logger.info("celery_reprocess_done", document_id=kwargs.get("document_id"))
    except Exception as exc:
        logger.error(
            "celery_reprocess_failed",
            document_id=kwargs.get("document_id"),
            attempt=self.request.retries + 1,
            error=str(exc),
        )
        self.retry(exc=exc)
