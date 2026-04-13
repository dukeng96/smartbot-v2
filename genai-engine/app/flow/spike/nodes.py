"""Spike LLM nodes: mock (offline) and real VNPT variant."""
import asyncio
from typing import Any

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage


async def mock_llm_node(state: dict[str, Any]) -> dict[str, Any]:
    """Mock LLM node — returns deterministic tokens for offline testing."""
    tokens = ["Hello", " from", " mock", " LLM", "!"]
    response = "".join(tokens)
    messages: list[BaseMessage] = state.get("messages", [])
    return {"messages": messages + [AIMessage(content=response)]}


async def vnpt_llm_node(state: dict[str, Any]) -> dict[str, Any]:
    """Real VNPT LLM node — streams via openai-compat endpoint."""
    from openai import AsyncOpenAI

    from app.config import settings

    client = AsyncOpenAI(
        api_key=settings.LLM_API_KEY,
        base_url=settings.LLM_BASE_URL,
    )
    messages = state.get("messages", [])
    api_messages = [
        {"role": "user" if isinstance(m, HumanMessage) else "assistant", "content": m.content}
        for m in messages
    ]

    stream = await client.chat.completions.create(
        model=settings.LLM_MODEL_SMALL,
        messages=api_messages,
        stream=True,
        max_tokens=256,
    )
    chunks: list[str] = []
    async for chunk in stream:
        delta = chunk.choices[0].delta.content or ""
        if delta:
            chunks.append(delta)
    response = "".join(chunks)
    return {"messages": messages + [AIMessage(content=response)]}
