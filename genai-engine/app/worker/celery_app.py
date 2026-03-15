"""
Celery app configuration for async document processing.
"""

from celery import Celery

from app.config import settings

celery_app = Celery(
    "genai-engine",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.worker.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,  # 1 task at a time per worker (GPU bound)
)
