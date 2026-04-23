"""KnowledgeBaseNode — retrieves relevant chunks via hybrid search (dense + sparse + RRF)."""
from __future__ import annotations

from typing import Any

from app.flow.base_node import BaseNode, NodeDefinition, NodeInput, NodeOutput
from app.flow.context import NodeExecutionContext
from app.flow.exceptions import NodeExecutionError
from app.flow.node_types import NodeCategory
from app.flow.registry import NodeRegistry
from app.flow.schemas.execution_event import ExecutionEvent, ExecutionEventType

_DEFAULT_TOP_K = 5


def _format_chunks_with_citation_tags(chunks: list[dict[str, Any]]) -> str:
    """Format chunks with XML-like tags for citation tracking by LLM."""
    parts = []
    for i, chunk in enumerate(chunks):
        content = chunk.get("text") or chunk.get("content", "")
        parts.append(f'<chunk_id="ref{i}">\n{content}\n</chunk_id>')
    return "\n\n".join(parts)


@NodeRegistry.register
class KnowledgeBaseNode(BaseNode):
    definition = NodeDefinition(
        type="knowledge_base",
        category=NodeCategory.RETRIEVAL,
        label="Knowledge Base",
        description=(
            "Retrieves relevant document chunks from a knowledge base using hybrid search. "
            "Returns top_k chunks as a list of {text, score, source} dicts, "
            "plus a combined context string."
        ),
        icon="book-open",
        inputs=[
            NodeInput(name="kb_id", type="string", required=True),
            NodeInput(name="query", type="string", required=True),
            NodeInput(name="top_k", type="number", required=False, default=_DEFAULT_TOP_K),
        ],
        outputs=[
            NodeOutput(name="chunks", type="array"),
            NodeOutput(name="context", type="string"),
        ],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict[str, Any]:
        kb_id = ctx.resolve(ctx.inputs.get("kb_id", ""))
        query = ctx.resolve(ctx.inputs.get("query", ""))
        top_k = int(ctx.inputs.get("top_k") or _DEFAULT_TOP_K)

        # Auto-resolve: if no kb_id configured in canvas, use first bot-attached KB
        if not kb_id:
            bot_kb_ids = ctx.state.get("bot_knowledge_base_ids") or []
            if bot_kb_ids:
                kb_id = bot_kb_ids[0]

        if not kb_id:
            raise NodeExecutionError("KnowledgeBaseNode: 'kb_id' input is required")
        if not query:
            raise NodeExecutionError("KnowledgeBaseNode: 'query' input is required")

        # Lazy import to avoid heavy service deps at module load time
        from app.dependencies import get_embedding_service  # type: ignore[import]

        embedding_service = get_embedding_service()
        collection_name = f"kb_{kb_id}"

        try:
            # Direct call — tritonclient.http uses gevent-patched httplib which
            # cooperatively yields. asyncio.to_thread() would spawn a new OS thread
            # causing a greenlet-thread conflict (gevent hub is bound to main thread).
            raw_chunks = embedding_service.hybrid_search(
                query=query,
                collection_names=[collection_name],
                top_k=top_k,
            )
        except Exception as exc:
            raise NodeExecutionError(f"KnowledgeBaseNode retrieval failed: {exc}") from exc

        chunks = [
            {
                "text": c.get("content", ""),
                "score": round(c.get("score_ranking", 0.0), 4),
                "source": c.get("document_id", ""),
                "document_name": c.get("document_name", ""),
                "breadcrumb": c.get("breadcrumb", ""),
            }
            for c in (raw_chunks or [])
        ]

        # Format context with citation tags for LLM
        context = _format_chunks_with_citation_tags(chunks)

        # Build retrieval_chunks metadata for frontend citation rendering
        retrieval_chunks = [
            {
                "ref_index": i,
                "content": chunk["text"],
                "document_name": chunk["document_name"],
                "breadcrumb": chunk["breadcrumb"],
            }
            for i, chunk in enumerate(chunks)
        ]

        # Emit retrieval event for frontend to capture chunks
        ctx.emit(ExecutionEvent(
            type=ExecutionEventType.RETRIEVAL,
            node_id=ctx.node_id,
            data={"chunks": retrieval_chunks},
        ))

        return {"chunks": chunks, "context": context, "retrieval_chunks": retrieval_chunks}
