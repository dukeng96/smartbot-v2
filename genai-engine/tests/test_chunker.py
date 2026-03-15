"""Tests for the Chunker service."""

from app.services.chunker import Chunker


class TestChunker:
    def setup_method(self):
        self.chunker = Chunker()

    def test_chunk_returns_list_of_dicts(self, sample_markdown):
        chunks = self.chunker.chunk(sample_markdown, chunk_size=200, chunk_overlap=20)
        assert isinstance(chunks, list)
        assert len(chunks) > 0
        for chunk in chunks:
            assert "content" in chunk
            assert "position" in chunk
            assert "char_count" in chunk

    def test_chunk_positions_are_sequential(self, sample_markdown):
        chunks = self.chunker.chunk(sample_markdown, chunk_size=200, chunk_overlap=20)
        positions = [c["position"] for c in chunks]
        assert positions == list(range(len(chunks)))

    def test_chunk_char_count_matches_content(self, sample_markdown):
        chunks = self.chunker.chunk(sample_markdown, chunk_size=200, chunk_overlap=20)
        for chunk in chunks:
            assert chunk["char_count"] == len(chunk["content"])

    def test_chunk_respects_max_size(self, sample_markdown):
        chunk_size = 300
        chunks = self.chunker.chunk(sample_markdown, chunk_size=chunk_size, chunk_overlap=30)
        for chunk in chunks:
            # Allow some tolerance since splitter may slightly exceed
            assert chunk["char_count"] <= chunk_size * 1.5

    def test_empty_text_returns_empty(self):
        assert self.chunker.chunk("") == []
        assert self.chunker.chunk("   ") == []

    def test_none_text_returns_empty(self):
        assert self.chunker.chunk(None) == []

    def test_short_text_single_chunk(self, short_text):
        chunks = self.chunker.chunk(short_text, chunk_size=500, chunk_overlap=50)
        assert len(chunks) == 1
        assert chunks[0]["content"] == short_text
        assert chunks[0]["position"] == 0

    def test_custom_chunk_size(self, sample_markdown):
        small_chunks = self.chunker.chunk(sample_markdown, chunk_size=100, chunk_overlap=10)
        large_chunks = self.chunker.chunk(sample_markdown, chunk_size=1000, chunk_overlap=50)
        assert len(small_chunks) > len(large_chunks)


class TestRRF:
    """Test the RRF scoring algorithm with mock results."""

    def test_compute_rrf_basic(self):
        from app.core.rrf import compute_rrf_scores

        class MockResult:
            def __init__(self, id, score, content="test", document_id="doc1"):
                self.id = id
                self.score = score
                self.payload = {"content": content, "document_id": document_id}

        dense = [MockResult("a", 0.9), MockResult("b", 0.8)]
        sparse = [MockResult("b", 1.5), MockResult("c", 1.0)]

        rrf = compute_rrf_scores(dense, sparse, top_k=3)

        assert "a" in rrf
        assert "b" in rrf
        assert "c" in rrf
        # "b" appears in both lists so should have highest RRF score
        assert rrf["b"]["score_ranking"] > rrf["a"]["score_ranking"]
        assert rrf["b"]["score_ranking"] > rrf["c"]["score_ranking"]

    def test_compute_rrf_preserves_content(self):
        from app.core.rrf import compute_rrf_scores

        class MockResult:
            def __init__(self, id, score, content, document_id):
                self.id = id
                self.score = score
                self.payload = {"content": content, "document_id": document_id}

        dense = [MockResult("x", 0.95, "hello world", "doc_42")]
        sparse = []

        rrf = compute_rrf_scores(dense, sparse)
        assert rrf["x"]["content"] == "hello world"
        assert rrf["x"]["document_id"] == "doc_42"

    def test_compute_rrf_empty_inputs(self):
        from app.core.rrf import compute_rrf_scores

        rrf = compute_rrf_scores([], [])
        assert rrf == {}
