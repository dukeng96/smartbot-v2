"""
Test configuration and shared fixtures.
"""

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
