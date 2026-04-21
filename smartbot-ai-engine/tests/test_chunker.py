"""Tests for the Chunker service."""

from app.services.chunker import Chunker, _count_headers


class TestChunker:
    def setup_method(self):
        self.chunker = Chunker()

    def test_chunk_returns_list_of_dicts(self, sample_markdown):
        chunks = self.chunker.chunk(sample_markdown)
        assert isinstance(chunks, list)
        assert len(chunks) > 0
        for chunk in chunks:
            assert "content" in chunk
            assert "position" in chunk
            assert "char_count" in chunk
            assert "word_count" in chunk
            assert "metadata" in chunk

    def test_chunk_positions_are_sequential(self, sample_markdown):
        chunks = self.chunker.chunk(sample_markdown)
        positions = [c["position"] for c in chunks]
        assert positions == list(range(len(chunks)))

    def test_chunk_char_count_matches_content(self, sample_markdown):
        chunks = self.chunker.chunk(sample_markdown)
        for chunk in chunks:
            assert chunk["char_count"] == len(chunk["content"])

    def test_empty_text_returns_empty(self):
        assert self.chunker.chunk("") == []
        assert self.chunker.chunk("   ") == []

    def test_none_text_returns_empty(self):
        assert self.chunker.chunk(None) == []

    def test_short_text_single_chunk(self, short_text):
        chunks = self.chunker.chunk(short_text)
        assert len(chunks) == 1
        assert chunks[0]["content"] == short_text
        assert chunks[0]["position"] == 0
        assert chunks[0]["metadata"] is None  # No headers → fallback mode


class TestChunkerDualMode:
    """Test dual-mode chunking behavior."""

    def setup_method(self):
        self.chunker = Chunker()

    def test_header_mode_triggered_with_enough_headers(self, sample_markdown):
        """Chunks should have metadata when >= 3 headers."""
        chunks = self.chunker.chunk(sample_markdown)

        assert len(chunks) > 0
        for chunk in chunks:
            assert chunk["metadata"] is not None
            assert "breadcrumb" in chunk["metadata"]

    def test_fallback_mode_with_few_headers(self):
        """Chunks should have metadata=None when < 3 headers."""
        text = """# Title

Some introductory paragraph.

## Overview

This is all the content without many headers.
Just paragraphs of text here.
"""
        chunks = self.chunker.chunk(text)

        assert len(chunks) > 0
        for chunk in chunks:
            assert chunk["metadata"] is None

    def test_fallback_mode_no_headers(self):
        """Plain text should use fallback mode."""
        text = """This is just plain text.
No markdown headers at all.
Multiple paragraphs of content.
"""
        chunks = self.chunker.chunk(text)

        assert len(chunks) > 0
        for chunk in chunks:
            assert chunk["metadata"] is None

    def test_metadata_contains_breadcrumb(self, sample_markdown):
        """Header mode chunks should have breadcrumb key."""
        chunks = self.chunker.chunk(sample_markdown)

        for chunk in chunks:
            if chunk["metadata"]:
                assert "breadcrumb" in chunk["metadata"]

    def test_breadcrumb_format(self):
        """Breadcrumb should be 'H1 > H2 > H3' format."""
        text = """# Chapter 1

Introduction text here.

## Section 1.1

Section content with details.

### Subsection 1.1.1

Detailed subsection content.

## Section 1.2

Another section here.
"""
        chunks = self.chunker.chunk(text)

        # Find a chunk from subsection 1.1.1
        subsection_chunk = None
        for chunk in chunks:
            if chunk["metadata"] and "Subsection 1.1.1" in chunk["content"]:
                subsection_chunk = chunk
                break

        assert subsection_chunk is not None
        breadcrumb = subsection_chunk["metadata"]["breadcrumb"]
        assert isinstance(breadcrumb, str)
        # Should contain parent headers
        assert "Chapter 1" in breadcrumb
        assert "Section 1.1" in breadcrumb

    def test_headers_in_code_blocks_ignored(self):
        """Headers inside code blocks should not be counted."""
        text = """# Real Header

Some content.

```python
# This is a comment, not a header
## Also not a header
```

More content here.
"""
        chunks = self.chunker.chunk(text)
        # Only 1 real header, should trigger fallback mode
        for chunk in chunks:
            assert chunk["metadata"] is None


class TestChunkerHeaderCounting:
    """Test header counting function."""

    def test_count_headers_basic(self):
        text = "# H1\n## H2\n### H3\n#### H4"
        # Only counts H1-H3
        assert _count_headers(text) == 3

    def test_count_headers_ignores_code_blocks(self):
        text = """# Real
```
# Fake
## Also fake
```
## Real2
"""
        assert _count_headers(text) == 2

    def test_count_headers_ignores_tilde_code_blocks(self):
        text = """# Real
~~~
# Fake
~~~
## Real2
"""
        assert _count_headers(text) == 2

    def test_count_headers_needs_space_after_hash(self):
        text = "#NoSpace\n# Valid Header\n##AlsoNoSpace\n## Valid H2"
        assert _count_headers(text) == 2

    def test_count_headers_empty_text(self):
        assert _count_headers("") == 0

    def test_count_headers_no_headers(self):
        assert _count_headers("Just plain text\nNo headers here") == 0


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
