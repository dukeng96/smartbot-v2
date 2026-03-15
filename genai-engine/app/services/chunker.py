"""
Chunker — splits markdown text into chunks for embedding.

Uses RecursiveCharacterTextSplitter with markdown-optimized separators
that prioritize document structure (headings > paragraphs > lines > sentences).
"""

from langchain_text_splitters import RecursiveCharacterTextSplitter


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


class Chunker:
    """Split markdown text into chunks for embedding."""

    def chunk(
        self,
        text: str,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
    ) -> list[dict]:
        """
        Split text into chunks.
        Returns list of {content: str, position: int, char_count: int}.
        """
        if not text or not text.strip():
            return []

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=MARKDOWN_SEPARATORS,
            length_function=len,
        )

        chunks = splitter.split_text(text)

        return [
            {
                "content": chunk,
                "position": i,
                "char_count": len(chunk),
            }
            for i, chunk in enumerate(chunks)
        ]
