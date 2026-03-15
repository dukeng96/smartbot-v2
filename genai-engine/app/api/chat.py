"""
Chat API routes with SSE streaming support.

POST /engine/v1/chat/completions — full RAG chat (SSE or JSON)
POST /engine/v1/chat/test — quick test without conversation logic
"""

import json
import uuid

import structlog
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse

from app.dependencies import get_rag_chat
from app.models.requests import ChatRequest, ChatTestRequest
from app.services.rag_chat import RAGChat

logger = structlog.get_logger()

router = APIRouter(tags=["chat"])


@router.post("/chat/completions")
async def chat_completions(
    body: ChatRequest,
    rag_chat: RAGChat = Depends(get_rag_chat),
):
    """Full RAG chat endpoint. Supports SSE streaming and JSON response."""
    response, search_query, retrieval_context = rag_chat.chat(
        message=body.message,
        system_prompt=body.system_prompt,
        knowledge_base_ids=body.knowledge_base_ids,
        conversation_history=body.conversation_history,
        top_k=body.top_k,
        memory_turns=body.memory_turns,
        stream=body.stream,
    )

    if body.stream:
        return EventSourceResponse(
            _stream_sse(response, search_query, retrieval_context)
        )

    # Non-streaming response
    answer = response.choices[0].message.content
    usage = response.usage
    return JSONResponse(
        {
            "answer": answer,
            "search_query": search_query,
            "retrieval_context": retrieval_context,
            "input_tokens": usage.prompt_tokens if usage else 0,
            "output_tokens": usage.completion_tokens if usage else 0,
        }
    )


@router.post("/chat/test")
async def chat_test(
    body: ChatTestRequest,
    rag_chat: RAGChat = Depends(get_rag_chat),
):
    """Quick test endpoint — no conversation history, no streaming."""
    response, search_query, retrieval_context = rag_chat.chat(
        message=body.message,
        system_prompt=body.system_prompt,
        knowledge_base_ids=body.knowledge_base_ids,
        conversation_history=[],
        top_k=body.top_k,
        memory_turns=1,
        stream=False,
    )

    answer = response.choices[0].message.content
    return JSONResponse(
        {
            "answer": answer,
            "search_query": search_query,
            "retrieval_context": retrieval_context,
        }
    )


async def _stream_sse(response, search_query: str, retrieval_context: list):
    """Generate SSE events from OpenAI streaming response.

    Wraps the stream loop in try-except so mid-stream errors emit an
    error event instead of silently dropping the connection.
    """
    message_id = str(uuid.uuid4())

    # Event: message_start
    yield {
        "event": "message_start",
        "data": json.dumps({"message_id": message_id}),
    }

    # Event: retrieval metadata
    yield {
        "event": "retrieval",
        "data": json.dumps(
            {
                "search_query": search_query,
                "chunks": retrieval_context,
            }
        ),
    }

    # Event: delta chunks — with error boundary
    input_tokens = 0
    output_tokens = 0
    try:
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield {
                    "event": "delta",
                    "data": json.dumps(
                        {"content": chunk.choices[0].delta.content}
                    ),
                }
            if hasattr(chunk, "usage") and chunk.usage:
                input_tokens = getattr(chunk.usage, "prompt_tokens", 0)
                output_tokens = getattr(chunk.usage, "completion_tokens", 0)
    except Exception as e:
        logger.error("sse_stream_error", message_id=message_id, error=str(e))
        yield {
            "event": "error",
            "data": json.dumps(
                {"error": "Stream interrupted", "detail": str(e)}
            ),
        }

    # Event: message_end
    yield {
        "event": "message_end",
        "data": json.dumps(
            {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
            }
        ),
    }
