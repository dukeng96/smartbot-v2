"""
Chunker — splits markdown text into chunks for embedding.

Uses RecursiveCharacterTextSplitter with markdown-optimized separators
that prioritize document structure (headings > paragraphs > lines > sentences).
Word-based chunking: 800 words per chunk, 100 words overlap.
"""

from langchain_text_splitters import RecursiveCharacterTextSplitter


CHUNK_SIZE_WORDS = 800
CHUNK_OVERLAP_WORDS = 100

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


class Chunker:
    """Split markdown text into chunks for embedding."""

    def chunk(self, text: str) -> list[dict]:
        """
        Split text into chunks using word-based sizing.
        Fixed values: 800 words per chunk, 100 words overlap.
        Returns list of {content: str, position: int, char_count: int, word_count: int}.
        """
        if not text or not text.strip():
            return []

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
            }
            for i, chunk in enumerate(chunks)
        ]
