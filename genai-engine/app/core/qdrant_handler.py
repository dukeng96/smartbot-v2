"""
QdrantHandler — adapted from vectordb_guide.py.

Manages Qdrant collections and vector operations for hybrid search
(dense + sparse). Refactored to class-based with Settings injection.

Key additions vs original:
- document_id in payload for per-document vector deletion
- delete_by_document_id method
- create_collection_if_not_exists method
"""

import math
import time

import structlog
from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance,
    Filter,
    FieldCondition,
    MatchValue,
    HnswConfigDiff,
    NamedSparseVector,
    NamedVector,
    OptimizersConfigDiff,
    PointStruct,
    SearchRequest,
    SparseIndexParams,
    SparseVector,
    SparseVectorParams,
    VectorParams,
)

from app.config import Settings, settings

logger = structlog.get_logger()


class QdrantHandler:
    """Qdrant vector database handler for hybrid search collections."""

    def __init__(self, app_settings: Settings | None = None):
        s = app_settings or settings
        self.url = s.QDRANT_URL
        self.on_disk = s.QDRANT_ON_DISK
        self.qdrant = QdrantClient(url=self.url, api_key=s.QDRANT_API_KEY)
        logger.info("qdrant_handler_init", url=self.url)

    def ping(self) -> bool:
        try:
            self.qdrant.get_collections()
            return True
        except Exception as e:
            logger.error("qdrant_ping_failed", error=str(e))
            return False

    def collection_exists(self, collection: str) -> bool:
        return self.qdrant.collection_exists(collection)

    def create_collection_if_not_exists(self, collection: str) -> bool:
        """Create hybrid collection if it doesn't exist. Returns True if created.

        Handles race condition: if a concurrent request creates the
        collection between the exists-check and create call, we catch the
        error and return False instead of crashing.
        """
        if self.collection_exists(collection):
            return False
        try:
            self._create_hybrid_collection(collection)
            return True
        except Exception as e:
            # Another process may have created it concurrently
            if self.collection_exists(collection):
                logger.info(
                    "qdrant_collection_race_resolved",
                    collection=collection,
                )
                return False
            raise RuntimeError(
                f"Failed to create collection '{collection}': {e}"
            ) from e

    def _create_hybrid_collection(
        self,
        collection: str,
        dims: int = 1024,
        m_hnsw: int = 1024,
        ef_construction: int = 128,
    ):
        """Create a hybrid collection with dense (cosine) + sparse vectors."""
        vectors_config = {
            "text-dense": VectorParams(
                size=dims,
                distance=Distance.COSINE,
                hnsw_config=HnswConfigDiff(
                    ef_construct=ef_construction,
                    m=m_hnsw,
                    on_disk=self.on_disk,
                ),
            )
        }
        sparse_vectors_config = {
            "text-sparse": SparseVectorParams(
                index=SparseIndexParams(on_disk=self.on_disk)
            )
        }
        hnsw_config = HnswConfigDiff(on_disk=True)
        optimizers_config = OptimizersConfigDiff(
            deleted_threshold=0.2,
            vacuum_min_vector_number=1000,
            default_segment_number=0,
            indexing_threshold=20000,
            flush_interval_sec=5,
        )

        self.qdrant.create_collection(
            collection_name=collection,
            vectors_config=vectors_config,
            sparse_vectors_config=sparse_vectors_config,
            hnsw_config=hnsw_config,
            optimizers_config=optimizers_config,
            timeout=60,
        )
        logger.info("qdrant_collection_created", collection=collection)

    def delete_collection(self, collection: str) -> None:
        self.qdrant.delete_collection(collection)
        logger.info("qdrant_collection_deleted", collection=collection)

    def upsert(
        self,
        entries: list[dict],
        collection: str,
        batch_size: int = 128,
        retries: int = 3,
        delay: int = 2,
    ) -> int:
        """
        Upsert entries into Qdrant collection.
        Each entry: {id, dense_vec, sparse_vec, content, document_id, position}
        sparse_vec format: {indices: list[int], values: list[float]}
        """
        points = []
        for entry in entries:
            payload = {
                "content": entry.get("content", ""),
                "document_id": entry.get("document_id", ""),
                "position": entry.get("position", 0),
            }
            point = PointStruct(
                id=entry["id"],
                vector={
                    "text-dense": entry["dense_vec"],
                    "text-sparse": SparseVector(
                        indices=entry["sparse_vec"]["indices"],
                        values=entry["sparse_vec"]["values"],
                    ),
                },
                payload=payload,
            )
            points.append(point)

        n_batches = math.ceil(len(points) / batch_size)
        current_bs = batch_size
        for batch_id in range(n_batches):
            for attempt in range(retries):
                try:
                    sub_points = points[
                        batch_id * current_bs : (batch_id + 1) * current_bs
                    ]
                    self.qdrant.upsert(
                        collection_name=collection, points=sub_points
                    )
                    break
                except Exception as e:
                    current_bs = max(1, current_bs // 2)
                    logger.warning(
                        "qdrant_upsert_retry",
                        attempt=attempt + 1,
                        error=str(e),
                    )
                    time.sleep(delay)
                    if attempt == retries - 1:
                        raise RuntimeError("All upsert retries failed.") from e

        return len(points)

    def delete_by_document_id(
        self, collection: str, document_id: str
    ) -> int:
        """Delete all points where payload.document_id matches."""
        result = self.qdrant.delete(
            collection_name=collection,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="document_id", match=MatchValue(value=document_id)
                    )
                ]
            ),
        )
        logger.info(
            "qdrant_vectors_deleted",
            collection=collection,
            document_id=document_id,
        )
        return getattr(result, "operation_id", 0)

    def hybrid_search(
        self,
        query_dense: list[float],
        query_sparse: dict,
        collection: str,
        limit: int = 200,
    ) -> tuple[list, list]:
        """
        Run batch search with dense + sparse queries.
        Returns (dense_results, sparse_results) for RRF fusion.
        """
        indices = [int(k) for k in query_sparse.keys()]
        values = [float(v) for v in query_sparse.values()]

        search_requests = [
            SearchRequest(
                vector=NamedVector(name="text-dense", vector=query_dense),
                limit=limit,
                with_payload=True,
            ),
            SearchRequest(
                vector=NamedSparseVector(
                    name="text-sparse",
                    vector=SparseVector(indices=indices, values=values),
                ),
                limit=limit,
                with_payload=True,
            ),
        ]

        dense_results, sparse_results = self.qdrant.search_batch(
            collection_name=collection, requests=search_requests
        )
        return dense_results, sparse_results

    def scroll_by_document_id(
        self,
        collection: str,
        document_id: str,
        limit: int = 20,
        offset: int | None = None,
    ) -> tuple[list, int | None]:
        """Scroll points filtered by document_id for chunk preview."""
        result = self.qdrant.scroll(
            collection_name=collection,
            scroll_filter=Filter(
                must=[
                    FieldCondition(
                        key="document_id", match=MatchValue(value=document_id)
                    )
                ]
            ),
            limit=limit,
            offset=offset,
            with_payload=True,
            with_vectors=False,
        )
        points, next_offset = result
        return points, next_offset
