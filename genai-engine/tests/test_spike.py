"""Spike SSE streaming tests: mock LLM (always runs) + real VNPT (skipped without creds)."""
import json
import os

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def app():
    """Build test app with spike router registered."""
    from fastapi import FastAPI

    from app.flow.spike.api import router as spike_router

    test_app = FastAPI()
    test_app.include_router(spike_router)
    return test_app


@pytest.mark.asyncio
async def test_spike_mock_sse_emits_tokens(app):
    """Mock LLM: SSE stream must emit token events then a done event."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        async with client.stream("POST", "/spike/execute", json={"message": "hi", "use_vnpt": False}) as resp:
            assert resp.status_code == 200
            assert "text/event-stream" in resp.headers["content-type"]

            events = []
            async for line in resp.aiter_lines():
                line = line.strip()
                if line.startswith("data:"):
                    payload = json.loads(line[len("data:"):].strip())
                    events.append(payload)

    assert len(events) > 0, "Expected at least one SSE event"
    token_events = [e for e in events if e["type"] == "token"]
    done_events = [e for e in events if e["type"] == "done"]
    assert len(token_events) > 0, "Expected token events"
    assert len(done_events) == 1, "Expected exactly one done event"
    assert done_events[0]["node_id"] is None
    # Tokens should reconstruct the mock response
    full_text = "".join(e["data"] for e in token_events)
    assert "Hello" in full_text


@pytest.mark.asyncio
async def test_spike_mock_no_error_events(app):
    """Mock LLM: no error events should appear in clean run."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        async with client.stream("POST", "/spike/execute", json={"message": "test", "use_vnpt": False}) as resp:
            events = []
            async for line in resp.aiter_lines():
                line = line.strip()
                if line.startswith("data:"):
                    events.append(json.loads(line[len("data:"):].strip()))

    error_events = [e for e in events if e["type"] == "error"]
    assert len(error_events) == 0, f"Unexpected error events: {error_events}"


@pytest.mark.asyncio
@pytest.mark.skipif(
    not os.getenv("VNPT_API_KEY") or not os.getenv("VNPT_BASE_URL"),
    reason="VNPT_API_KEY and VNPT_BASE_URL not set — skipping real VNPT test",
)
async def test_spike_vnpt_sse_streams(app, monkeypatch):
    """Real VNPT: SSE stream emits tokens from actual endpoint. Requires env creds."""
    monkeypatch.setenv("LLM_API_KEY", os.environ["VNPT_API_KEY"])
    monkeypatch.setenv("LLM_BASE_URL", os.environ["VNPT_BASE_URL"])

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        async with client.stream("POST", "/spike/execute", json={"message": "Say hi briefly", "use_vnpt": True}) as resp:
            assert resp.status_code == 200
            events = []
            async for line in resp.aiter_lines():
                line = line.strip()
                if line.startswith("data:"):
                    events.append(json.loads(line[len("data:"):].strip()))

    token_events = [e for e in events if e["type"] == "token"]
    done_events = [e for e in events if e["type"] == "done"]
    assert len(token_events) > 0, "Expected tokens from VNPT"
    assert len(done_events) == 1
