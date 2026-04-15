"""
Health check endpoint — verifies Triton and Qdrant connectivity.

Triton calls are offloaded to asyncio.to_thread() to avoid
gevent-greenlet / asyncio thread-mismatch errors.
"""

import structlog
from fastapi import APIRouter, Depends

from app.core.qdrant_handler import QdrantHandler
from app.core.triton_client import TritonClient
from app.dependencies import get_qdrant_handler, get_triton_client

logger = structlog.get_logger()
router = APIRouter()


@router.get("/health")
async def health_check(
    triton: TritonClient = Depends(get_triton_client),
    qdrant: QdrantHandler = Depends(get_qdrant_handler),
):
    triton_status = "unknown"
    qdrant_status = "unknown"

    try:
        # Direct call — avoids binding gevent connection pool to a worker thread.
        # asyncio.to_thread() would cause "cannot switch to a different thread" errors
        # when the KB flow node later calls triton from the event loop thread.
        ready = triton.triton_client.is_server_ready()
        triton_status = "connected" if ready else "not_ready"
    except Exception as e:
        triton_status = f"error: {e}"
        logger.warning("triton_health_check_failed", error=str(e))

    try:
        qdrant.qdrant.get_collections()
        qdrant_status = "connected"
    except Exception as e:
        qdrant_status = f"error: {e}"
        logger.warning("qdrant_health_check_failed", error=str(e))

    return {
        "status": "ok",
        "triton": triton_status,
        "qdrant": qdrant_status,
    }
