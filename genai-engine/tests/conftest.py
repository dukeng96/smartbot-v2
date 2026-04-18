"""
Test configuration and shared fixtures.
"""
from __future__ import annotations

import os

import pytest


@pytest.fixture
def sample_markdown():
    return """# Introduction

This is a sample document for testing the chunking pipeline.
It contains multiple sections with different content.

## Section One

This section has some detailed text about a specific topic.
The text is long enough to demonstrate how the chunker splits content
across paragraph boundaries while respecting markdown structure.

### Subsection 1.1

Here we have a subsection with additional details.
These details are important for understanding the full context.

## Section Two

Another top-level section with different content.
This helps verify that chunks respect heading boundaries.

| Column A | Column B |
|----------|----------|
| Value 1  | Value 2  |
| Value 3  | Value 4  |

## Conclusion

Final section wrapping up the document content.
"""


@pytest.fixture
def short_text():
    return "This is a short text that should result in a single chunk."


# ── Node auto-registration (session scope) ────────────────────────────────────


@pytest.fixture(scope="session", autouse=True)
def _register_all_nodes() -> None:
    """Import app.flow.nodes once per session to trigger all NodeRegistry.register() calls."""
    import app.flow.nodes  # noqa: F401


# ── Memory store cleanup ──────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def _clear_memory_store():
    """Wipe MemoryNode's in-process _store before and after each test."""
    from app.flow.nodes.memory import _clear_store

    _clear_store()
    yield
    _clear_store()


# ── Credential fixtures (integration tests only) ─────────────────────────────


@pytest.fixture(scope="session")
def vnpt_api_key() -> str:
    """VNPT LLM API key. Skips test when not set."""
    key = os.environ.get("VNPT_API_KEY") or os.environ.get("LLM_API_KEY")
    if not key:
        pytest.skip("VNPT_API_KEY not set — skipping LLM integration test")
    return key


@pytest.fixture(scope="session")
def test_kb_id() -> str:
    """ID of a test knowledge base in local Qdrant. Skips when not set."""
    kb_id = os.environ.get("TEST_KB_ID")
    if not kb_id:
        pytest.skip("TEST_KB_ID not set — skipping KB integration test")
    return kb_id


@pytest.fixture(scope="session")
def internal_api_key() -> str:
    """NestJS X-Internal-Key. Skips when not set."""
    key = os.environ.get("INTERNAL_API_KEY") or os.environ.get("WEB_BACKEND_INTERNAL_KEY")
    if not key:
        pytest.skip("INTERNAL_API_KEY not set — skipping agent+tool integration test")
    return key


@pytest.fixture(scope="session")
def test_custom_tool_id() -> str:
    """Custom tool ID for agent integration tests. Skips when not set."""
    tool_id = os.environ.get("TEST_CUSTOM_TOOL_ID")
    if not tool_id:
        pytest.skip("TEST_CUSTOM_TOOL_ID not set — skipping agent+tool integration test")
    return tool_id
