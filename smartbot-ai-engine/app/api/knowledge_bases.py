"""
Knowledge Base management API routes.

POST /engine/v1/knowledge-bases — create Qdrant collection
DELETE /engine/v1/knowledge-bases/{knowledge_base_id} — delete collection
"""

import structlog
from fastapi import APIRouter, Depends

from app.dependencies import get_embedding_service
from app.models.requests import CreateCollectionRequest
from app.models.responses import CollectionResponse, DeleteCollectionResponse
from app.services.embedding_service import EmbeddingService

logger = structlog.get_logger()

router = APIRouter(tags=["knowledge-bases"])


@router.post("/knowledge-bases", response_model=CollectionResponse)
def create_knowledge_base(
    body: CreateCollectionRequest,
    embedding: EmbeddingService = Depends(get_embedding_service),
):
    """Create Qdrant collection for a knowledge base."""
    collection_name = f"kb_{body.knowledge_base_id}"
    created = embedding.ensure_collection(collection_name)
    logger.info(
        "kb_create",
        collection=collection_name,
        created=created,
    )
    return CollectionResponse(
        collection_name=collection_name,
        created=created,
    )


@router.delete(
    "/knowledge-bases/{knowledge_base_id}",
    response_model=DeleteCollectionResponse,
)
def delete_knowledge_base(
    knowledge_base_id: str,
    embedding: EmbeddingService = Depends(get_embedding_service),
):
    """Delete Qdrant collection for a knowledge base."""
    collection_name = f"kb_{knowledge_base_id}"
    try:
        embedding.delete_collection(collection_name)
        logger.info("kb_deleted", collection=collection_name)
        return DeleteCollectionResponse(deleted=True)
    except Exception as e:
        logger.warning("kb_delete_failed", collection=collection_name, error=str(e))
        return DeleteCollectionResponse(deleted=False)
