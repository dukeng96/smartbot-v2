"""
DocumentProcessor — full document ingestion pipeline.

Steps:
1. Extract text (Marker Cloud / trafilatura / passthrough)
2. Save extracted markdown to MinIO (for re-chunking without calling Marker again)
3. Chunk text
4. Embed + upsert to Qdrant
5. Callback to Web Backend with status updates
"""

import structlog
import httpx

from app.config import Settings, settings
from app.services.chunker import Chunker
from app.services.embedding_service import EmbeddingService
from app.services.text_extractor import TextExtractor

logger = structlog.get_logger()


class DocumentProcessor:
    """Orchestrate the full document processing pipeline."""

    def __init__(
        self,
        extractor: TextExtractor,
        chunker: Chunker,
        embedding: EmbeddingService,
        app_settings: Settings | None = None,
    ):
        s = app_settings or settings
        self.extractor = extractor
        self.chunker = chunker
        self.embedding = embedding
        self.callback_url = s.WEB_BACKEND_URL
        self.callback_key = s.WEB_BACKEND_INTERNAL_KEY

    async def process(
        self,
        document_id: str,
        knowledge_base_id: str,
        tenant_id: str,
        storage_path: str | None = None,
        mime_type: str | None = None,
        source_type: str = "file_upload",
        source_url: str | None = None,
        raw_text: str | None = None,
        **_kwargs,  # ignore legacy chunk_size/chunk_overlap from old jobs
    ) -> None:
        """Full pipeline called by Celery worker."""
        collection_name = f"kb_{knowledge_base_id}"

        try:
            # Step 1: Extract text
            await self._update_status(document_id, "extracting", 10)

            markdown_text, metadata = await self.extractor.extract(
                source_type=source_type,
                storage_path=storage_path,
                source_url=source_url,
                raw_text=raw_text,
                mime_type=mime_type,
            )

            # Extract images from metadata (if Marker Cloud provided them)
            images = metadata.pop("images", None)

            # Save markdown to MinIO (with images if present)
            markdown_path = self.extractor.save_markdown_to_s3(
                document_id, markdown_text, images=images
            )

            await self._update_status(
                document_id,
                "chunking",
                40,
                extra={"markdown_storage_path": markdown_path},
            )

            # Step 2: Chunk (word-based, fixed 800/100)
            chunks = self.chunker.chunk(markdown_text)

            if not chunks:
                await self._update_status(
                    document_id,
                    "completed",
                    100,
                    extra={"char_count": 0, "chunk_count": 0},
                )
                return

            await self._update_status(document_id, "embedding", 60)

            # Step 3: Ensure Qdrant collection exists
            self.embedding.ensure_collection(collection_name)

            # Step 3.5: Delete any existing vectors for this document (idempotent re-processing)
            self.embedding.delete_document_vectors(collection_name, document_id)

            # Step 4: Embed + upsert
            chunk_count = self.embedding.embed_and_upsert(
                chunks=chunks,
                collection_name=collection_name,
                document_id=document_id,
            )

            total_chars = sum(c["char_count"] for c in chunks)

            # Step 5: Callback success
            await self._update_status(
                document_id,
                "completed",
                100,
                extra={
                    "char_count": total_chars,
                    "chunk_count": chunk_count,
                    "metadata": metadata,
                },
            )
            logger.info(
                "document_processed",
                document_id=document_id,
                chunk_count=chunk_count,
                total_chars=total_chars,
            )

        except Exception as e:
            logger.error(
                "document_process_failed",
                document_id=document_id,
                error=str(e),
            )
            await self._update_status(
                document_id,
                "error",
                0,
                extra={"error_message": str(e)},
            )
            raise

    async def reprocess(
        self,
        document_id: str,
        knowledge_base_id: str,
        markdown_storage_path: str,
        **_kwargs,  # ignore legacy chunk_size/chunk_overlap from old jobs
    ) -> None:
        """Re-chunk from saved markdown. Skips Marker API call."""
        collection_name = f"kb_{knowledge_base_id}"

        try:
            # 1. Delete old vectors
            self.embedding.delete_document_vectors(collection_name, document_id)

            # 2. Load markdown from MinIO
            markdown_text = self.extractor.load_markdown_from_s3(
                markdown_storage_path
            )

            # 3. Re-chunk (word-based, fixed 800/100)
            chunks = self.chunker.chunk(markdown_text)

            # 4. Re-embed + upsert
            chunk_count = self.embedding.embed_and_upsert(
                chunks, collection_name, document_id
            )
            total_chars = sum(c["char_count"] for c in chunks)

            await self._update_status(
                document_id,
                "completed",
                100,
                extra={
                    "char_count": total_chars,
                    "chunk_count": chunk_count,
                },
            )
            logger.info(
                "document_reprocessed",
                document_id=document_id,
                chunk_count=chunk_count,
            )

        except Exception as e:
            logger.error(
                "document_reprocess_failed",
                document_id=document_id,
                error=str(e),
            )
            await self._update_status(
                document_id,
                "error",
                0,
                extra={"error_message": str(e)},
            )
            raise

    async def _update_status(
        self,
        document_id: str,
        status: str,
        progress: int,
        extra: dict | None = None,
        max_retries: int = 3,
    ) -> None:
        """Callback to Web Backend with exponential backoff retry.

        Won't block the pipeline even if all retries fail — logs a
        warning and continues.
        """
        payload = {
            "status": status,
            "processing_step": (
                status if status not in ("completed", "error") else None
            ),
            "processing_progress": progress,
            **(extra or {}),
        }
        url = f"{self.callback_url}/api/v1/internal/documents/{document_id}/status"
        headers = {"X-Internal-Key": self.callback_key}

        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.patch(
                        url, json=payload, headers=headers, timeout=10,
                    )
                    resp.raise_for_status()
                logger.debug(
                    "callback_sent",
                    document_id=document_id,
                    status=status,
                )
                return
            except Exception as e:
                wait = 2 ** attempt  # 1s, 2s, 4s
                logger.warning(
                    "callback_retry",
                    document_id=document_id,
                    status=status,
                    attempt=attempt + 1,
                    max_retries=max_retries,
                    error=str(e),
                )
                if attempt < max_retries - 1:
                    import asyncio
                    await asyncio.sleep(wait)

        logger.warning(
            "callback_exhausted",
            document_id=document_id,
            status=status,
        )
