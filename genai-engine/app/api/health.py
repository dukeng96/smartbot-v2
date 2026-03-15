"""
Health check endpoint — verifies Triton and Qdrant connectivity.
"""

import structlog
from fastapi import APIRouter, Depends

from app.core.qdrant_handler import QdrantHandler
from app.core.triton_client import TritonClient
from app.dependencies import get_qdrant_handler, get_triton_client

logger = structlog.get_logger()
router = APIRouter()


@router.get("/health")
def health_check(
    triton: TritonClient = Depends(get_triton_client),
    qdrant: QdrantHandler = Depends(get_qdrant_handler),
):
    triton_status = "unknown"
    qdrant_status = "unknown"

    try:
        if triton.triton_client.is_server_ready():
            triton_status = "connected"
        else:
            triton_status = "not_ready"
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
