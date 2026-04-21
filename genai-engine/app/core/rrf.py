"""
Reciprocal Rank Fusion (RRF) — kept from vectordb_guide.py.

Merges dense and sparse search results by rank-based scoring.
Formula: RRF_score = 1 / (k + rank)
"""


def compute_rrf_scores(
    dense_results: list,
    sparse_results: list,
    top_k: int = 10,
    k: int = 1,
) -> dict:
    """
    Merge dense and sparse search results using RRF.
    Returns dict keyed by point ID with score_ranking, content,
    document_id, score_dense, score_sparse.
    """
    dense_results = sorted(dense_results, key=lambda x: x.score, reverse=True)
    sparse_results = sorted(
        sparse_results, key=lambda x: x.score, reverse=True
    )

    rrf_scores: dict = {}

    def process_results(results: list, score_type: str | None):
        for idx, result in enumerate(results):
            _id = result.id
            if _id not in rrf_scores:
                payload = result.payload or {}
                rrf_scores[_id] = {
                    "score_ranking": 0,
                    "content": payload.get("content", ""),
                    "document_id": payload.get("document_id", ""),
                    "breadcrumb": payload.get("breadcrumb"),
                    "h1": payload.get("h1"),
                    "h2": payload.get("h2"),
                    "h3": payload.get("h3"),
                }
            rank = idx + 1
            rrf_scores[_id]["score_ranking"] += 1 / (k + rank)
            if score_type is not None:
                rrf_scores[_id][score_type] = result.score

    process_results(dense_results, "score_dense")
    process_results(sparse_results, "score_sparse")

    sorted_results = dict(
        sorted(
            rrf_scores.items(),
            key=lambda item: item[1]["score_ranking"],
            reverse=True,
        )
    )
    return sorted_results
