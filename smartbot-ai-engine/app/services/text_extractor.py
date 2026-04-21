"""
TextExtractor — extracts text from multiple source types.

- file_upload (PDF, DOCX, PPTX, XLSX, images, EPUB): Marker Cloud API -> Markdown
- url_crawl: trafilatura -> plain text
- text_input: passthrough

Saves extracted markdown to S3 for re-chunking without calling Marker API again.
"""

import os
import tempfile

import structlog
import trafilatura
from datalab_sdk import DatalabClient

from app.config import Settings, settings
from app.services.storage import StorageService

logger = structlog.get_logger()

MIME_EXT_MAP = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "application/epub+zip": ".epub",
}

PLAIN_TEXT_MIMES = {"text/plain", "text/csv", "text/markdown"}


class TextExtractor:
    """Extract text from file uploads, URLs, or raw text input."""

    def __init__(
        self,
        storage: StorageService,
        app_settings: Settings | None = None,
    ):
        s = app_settings or settings
        self.storage = storage
        self.marker_client = DatalabClient(api_key=s.DATALAB_API_KEY)

    async def extract(
        self,
        source_type: str,
        storage_path: str | None = None,
        source_url: str | None = None,
        raw_text: str | None = None,
        mime_type: str | None = None,
    ) -> tuple[str, dict]:
        """
        Extract text from source.
        Returns (markdown_text, metadata).
        """
        if source_type == "text_input":
            return self._extract_text_input(raw_text)
        elif source_type == "url_crawl":
            return self._extract_url(source_url)
        elif source_type == "file_upload":
            return self._extract_file(storage_path, mime_type)
        else:
            raise ValueError(f"Unknown source_type: {source_type}")

    def _extract_text_input(self, raw_text: str | None) -> tuple[str, dict]:
        if not raw_text:
            raise ValueError("raw_text is required for text_input source_type")
        return raw_text, {"extraction_method": "passthrough"}

    def _extract_url(self, source_url: str | None) -> tuple[str, dict]:
        if not source_url:
            raise ValueError("source_url is required for url_crawl source_type")

        downloaded = trafilatura.fetch_url(source_url)
        text = trafilatura.extract(
            downloaded, include_tables=True, include_links=True
        )
        if not text:
            raise ValueError(f"Could not extract content from URL: {source_url}")

        return text, {
            "extraction_method": "trafilatura",
            "source_url": source_url,
        }

    def _extract_file(
        self, storage_path: str | None, mime_type: str | None
    ) -> tuple[str, dict]:
        if not storage_path:
            raise ValueError("storage_path is required for file_upload source_type")

        # Plain text files: read directly from S3
        if mime_type in PLAIN_TEXT_MIMES:
            data = self.storage.download_bytes(storage_path)
            text = data.decode("utf-8")
            return text, {"extraction_method": "direct_read"}

        # Binary files (PDF, DOCX, etc.): download to temp, call Marker Cloud
        ext = MIME_EXT_MAP.get(mime_type, ".bin")
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp_path = tmp.name

        try:
            self.storage.download_to_file(storage_path, tmp_path)

            result = self.marker_client.convert(tmp_path)
            markdown = result.markdown or ""

            metadata = {"extraction_method": "marker_cloud"}
            return markdown, metadata
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def save_markdown_to_s3(self, document_id: str, markdown: str) -> str:
        """Save extracted markdown to S3 for re-chunking later."""
        key = f"markdown/{document_id}.md"
        self.storage.upload_bytes(key, markdown.encode("utf-8"), "text/markdown")
        return key

    def load_markdown_from_s3(self, markdown_path: str) -> str:
        """Load previously extracted markdown from S3."""
        data = self.storage.download_bytes(markdown_path)
        return data.decode("utf-8")
