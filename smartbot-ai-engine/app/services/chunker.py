"""
Chunker — splits markdown text into chunks for embedding.

Dual-mode chunking:
- Header mode (>= 3 ATX headers): MarkdownHeaderTextSplitter with metadata
- Fallback mode (< 3 headers): RecursiveCharacterTextSplitter, no metadata

Word-based sizing: 800 words per chunk, 100 words overlap.
"""

import re

from langchain_text_splitters import (
    MarkdownHeaderTextSplitter,
    RecursiveCharacterTextSplitter,
)

# Existing constants
CHUNK_SIZE_WORDS = 800
CHUNK_OVERLAP_WORDS = 100

# New constants for dual-mode
HEADER_THRESHOLD = 3
MIN_CHUNK_WORDS = 200
HEADERS_TO_SPLIT = [("#", "H1"), ("##", "H2"), ("###", "H3")]

MARKDOWN_SEPARATORS = [
    "\n# ",    # H1
    "\n## ",   # H2
    "\n### ",  # H3
    "\n#### ", # H4
    "\n\n",    # Paragraph break
    "\n",      # Line break
    ". ",      # Sentence end
    " ",       # Word (last resort)
]


def _word_count(text: str) -> int:
    """Count words in text (split by whitespace)."""
    return len(text.split())


def _count_headers(text: str) -> int:
    """Count ATX headers (H1-H3) outside code blocks."""
    # Remove code blocks first
    no_code = re.sub(r"```[\s\S]*?```", "", text)
    no_code = re.sub(r"~~~[\s\S]*?~~~", "", no_code)
    # Count lines starting with #, ##, or ### followed by space and content
    pattern = r"^#{1,3}\s+\S"
    return len(re.findall(pattern, no_code, re.MULTILINE))


def _build_breadcrumb(metadata: dict) -> str:
    """Build 'H1 > H2 > H3' breadcrumb from metadata."""
    parts = []
    for key in ["H1", "H2", "H3"]:
        if metadata.get(key):
            parts.append(metadata[key])
    return " > ".join(parts) if parts else ""


def _metadata_depth(metadata: dict | None) -> int:
    """Return specificity depth of header metadata (0=None, 1=H1, 2=H1+H2, 3=H1+H2+H3)."""
    if not metadata:
        return 0
    return sum(1 for k in ("H1", "H2", "H3") if metadata.get(k))


def _merge_small_chunks(chunks: list, min_words: int) -> list:
    """Merge chunks < min_words into previous chunk.

    Metadata strategy: keep the deepest (most specific) metadata seen during
    the merge so the merged chunk reflects the richest header context present
    in the combined content.
    """
    if not chunks:
        return []

    merged = []
    buffer = None

    for chunk in chunks:
        if buffer is None:
            buffer = dict(chunk)  # Copy to avoid mutation
            continue

        chunk_words = _word_count(chunk["content"])

        if chunk_words < min_words:
            # Keep the more specific metadata (higher header depth wins).
            best_meta = (
                chunk["metadata"]
                if _metadata_depth(chunk["metadata"]) > _metadata_depth(buffer["metadata"])
                else buffer["metadata"]
            )
            buffer = {
                "content": buffer["content"] + "\n\n" + chunk["content"],
                "metadata": best_meta,
            }
        else:
            merged.append(buffer)
            buffer = dict(chunk)  # Copy to avoid mutation

    if buffer:
        merged.append(buffer)

    return merged


def _chunk_with_headers(text: str) -> list[dict]:
    """Split by headers, sub-split oversized, merge undersized."""
    # Phase 1: Split by headers
    md_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=HEADERS_TO_SPLIT,
        strip_headers=False,
    )
    header_chunks = md_splitter.split_text(text)

    # Phase 2: Sub-split oversized chunks
    char_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE_WORDS,
        chunk_overlap=CHUNK_OVERLAP_WORDS,
        separators=MARKDOWN_SEPARATORS,
        length_function=_word_count,
    )

    results = []
    for doc in header_chunks:
        content = doc.page_content
        metadata = dict(doc.metadata)

        word_count = _word_count(content)

        if word_count > CHUNK_SIZE_WORDS:
            # Sub-split, propagate metadata
            sub_chunks = char_splitter.split_text(content)
            for sub in sub_chunks:
                results.append({
                    "content": sub,
                    "metadata": {**metadata, "breadcrumb": _build_breadcrumb(metadata)},
                })
        else:
            results.append({
                "content": content,
                "metadata": {**metadata, "breadcrumb": _build_breadcrumb(metadata)},
            })

    # Phase 3: Merge undersized chunks
    merged = _merge_small_chunks(results, MIN_CHUNK_WORDS)

    # Add position, char_count, word_count
    return [
        {
            "content": c["content"],
            "position": i,
            "char_count": len(c["content"]),
            "word_count": _word_count(c["content"]),
            "metadata": c["metadata"],
        }
        for i, c in enumerate(merged)
    ]


class Chunker:
    """Split markdown text into chunks for embedding."""

    def chunk(self, text: str | None) -> list[dict]:
        """
        Dual-mode chunking:
        - >= 3 headers: header-based with metadata {H1, H2, H3, breadcrumb}
        - < 3 headers: fallback with metadata=None

        Returns list of {content, position, char_count, word_count, metadata}.
        """
        if text is None or not isinstance(text, str) or not text.strip():
            return []

        header_count = _count_headers(text)

        if header_count >= HEADER_THRESHOLD:
            return _chunk_with_headers(text)

        # Fallback: current approach, no metadata
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE_WORDS,
            chunk_overlap=CHUNK_OVERLAP_WORDS,
            separators=MARKDOWN_SEPARATORS,
            length_function=_word_count,
        )
        chunks = splitter.split_text(text)

        return [
            {
                "content": chunk,
                "position": i,
                "char_count": len(chunk),
                "word_count": _word_count(chunk),
                "metadata": None,
            }
            for i, chunk in enumerate(chunks)
        ]
