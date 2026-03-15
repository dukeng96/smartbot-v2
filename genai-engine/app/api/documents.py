"""
Document processing API routes.

POST /engine/v1/documents/process — queue document processing
POST /engine/v1/documents/{document_id}/reprocess — re-chunk from saved markdown
DELETE /engine/v1/documents/{document_id}/vectors — delete vectors by document_id
GET /engine/v1/documents/{document_id}/chunks — preview chunks
"""

import structlog
from fastapi import APIRouter, Depends, Query

from app.dependencies import get_embedding_service, get_qdrant_handler
from app.core.qdrant_handler import QdrantHandler
from app.models.requests import (
    DeleteVectorsRequest,
    ProcessDocumentRequest,
    ReprocessDocumentRequest,
)
from app.models.responses import (
    ChunkItem,
    ChunksResponse,
    DeleteVectorsResponse,
    JobResponse,
)
from app.services.embedding_service import EmbeddingService
from app.worker.tasks import process_document_task, reprocess_document_task

logger = structlog.get_logger()

router = APIRouter(tags=["documents"])


@router.post("/documents/process", response_model=JobResponse)
def process_document(body: ProcessDocumentRequest):
    """Queue a document for async processing via Celery."""
    task = process_document_task.delay(
        document_id=body.document_id,
        knowledge_base_id=body.knowledge_base_id,
        tenant_id=body.tenant_id,
        storage_path=body.storage_path,
        mime_type=body.mime_type,
        source_type=body.source_type,
        source_url=body.source_url,
        raw_text=body.raw_text,
        chunk_size=body.chunk_size,
        chunk_overlap=body.chunk_overlap,
    )
    logger.info(
        "document_process_queued",
        document_id=body.document_id,
        job_id=task.id,
    )
    return JobResponse(job_id=task.id, status="queued")


@router.post(
    "/documents/{document_id}/reprocess",
    response_model=JobResponse,
)
def reprocess_document(document_id: str, body: ReprocessDocumentRequest):
    """Queue re-chunking from saved markdown (no Marker API call)."""
    task = reprocess_document_task.delay(
        document_id=document_id,
        knowledge_base_id=body.knowledge_base_id,
        markdown_storage_path=body.markdown_storage_path,
        chunk_size=body.chunk_size,
        chunk_overlap=body.chunk_overlap,
    )
    logger.info(
        "document_reprocess_queued",
        document_id=document_id,
        job_id=task.id,
    )
    return JobResponse(job_id=task.id, status="queued")


@router.delete(
    "/documents/{document_id}/vectors",
    response_model=DeleteVectorsResponse,
)
def delete_document_vectors(
    document_id: str,
    body: DeleteVectorsRequest,
    embedding: EmbeddingService = Depends(get_embedding_service),
):
    """Delete all vectors for a specific document from Qdrant."""
    collection_name = f"kb_{body.knowledge_base_id}"
    result = embedding.delete_document_vectors(collection_name, document_id)
    logger.info(
        "document_vectors_deleted",
        document_id=document_id,
        collection=collection_name,
    )
    return DeleteVectorsResponse(deleted_chunks=result)


@router.get(
    "/documents/{document_id}/chunks",
    response_model=ChunksResponse,
)
def get_document_chunks(
    document_id: str,
    knowledge_base_id: str = Query(...),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    qdrant: QdrantHandler = Depends(get_qdrant_handler),
):
    """Preview chunks stored in Qdrant for a document."""
    collection_name = f"kb_{knowledge_base_id}"

    # Use scroll with offset for pagination
    offset = (page - 1) * limit if page > 1 else None
    points, _next_offset = qdrant.scroll_by_document_id(
        collection=collection_name,
        document_id=document_id,
        limit=limit,
        offset=offset,
    )

    chunks = []
    for point in points:
        payload = point.payload or {}
        content = payload.get("content", "")
        chunks.append(
            ChunkItem(
                content=content,
                position=payload.get("position", 0),
                char_count=len(content),
            )
        )

    return ChunksResponse(
        chunks=chunks,
        total=len(chunks),
        page=page,
    )
