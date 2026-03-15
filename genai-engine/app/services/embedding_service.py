"""
EmbeddingService — orchestrates Triton embedding + Qdrant vector operations.

Provides high-level methods for embed+upsert, delete, and hybrid search
across multiple collections with RRF fusion.
"""

import uuid

import structlog

from app.core.qdrant_handler import QdrantHandler
from app.core.rrf import compute_rrf_scores
from app.core.triton_client import TritonClient

logger = structlog.get_logger()


class EmbeddingService:
    """Orchestrate embedding + Qdrant operations."""

    def __init__(self, triton: TritonClient, qdrant: QdrantHandler):
        self.triton = triton
        self.qdrant = qdrant

    def ensure_collection(self, collection_name: str) -> bool:
        return self.qdrant.create_collection_if_not_exists(collection_name)

    def embed_and_upsert(
        self,
        chunks: list[dict],
        collection_name: str,
        document_id: str,
    ) -> int:
        """Embed chunks and upsert into Qdrant. Returns chunk count."""
        texts = [c["content"] for c in chunks]
        if not texts:
            return 0

        dense_vecs, sparse_vecs = self.triton.compute_vectors(texts)

        entries = []
        for i, chunk in enumerate(chunks):
            indices = [int(k) for k in sparse_vecs[i].keys()]
            values = [float(v) for v in sparse_vecs[i].values()]
            entries.append(
                {
                    "id": str(uuid.uuid4()),
                    "dense_vec": dense_vecs[i],
                    "sparse_vec": {"indices": indices, "values": values},
                    "content": chunk["content"],
                    "document_id": document_id,
                    "position": chunk["position"],
                }
            )

        self.qdrant.upsert(entries, collection=collection_name)
        logger.info(
            "embedding_upsert_done",
            collection=collection_name,
            document_id=document_id,
            count=len(entries),
        )
        return len(entries)

    def delete_document_vectors(
        self, collection_name: str, document_id: str
    ) -> int:
        return self.qdrant.delete_by_document_id(collection_name, document_id)

    def delete_collection(self, collection_name: str) -> None:
        self.qdrant.delete_collection(collection_name)

    def hybrid_search(
        self,
        query: str,
        collection_names: list[str],
        top_k: int = 5,
    ) -> list[dict]:
        """
        Hybrid search across multiple collections, merge with RRF.
        Returns list of {content, document_id, score_ranking, score_dense, score_sparse}.
        """
        query_dense, query_sparse = self.triton.compute_vectors([query])
        dense_vec = query_dense[0]
        sparse_vec = query_sparse[0]

        all_results: list[dict] = []
        for collection_name in collection_names:
            try:
                dense_results, sparse_results = self.qdrant.hybrid_search(
                    query_dense=dense_vec,
                    query_sparse=sparse_vec,
                    collection=collection_name,
                    limit=top_k * 3,
                )
                rrf = compute_rrf_scores(
                    dense_results, sparse_results, top_k=top_k
                )
                for doc_id, info in rrf.items():
                    info["_qdrant_id"] = doc_id
                    info["collection"] = collection_name
                    all_results.append(info)
            except Exception as e:
                logger.warning(
                    "hybrid_search_collection_failed",
                    collection=collection_name,
                    error=str(e),
                )
                continue

        all_results.sort(key=lambda x: x["score_ranking"], reverse=True)
        return all_results[:top_k]
