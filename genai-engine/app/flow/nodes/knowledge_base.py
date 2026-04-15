"""KnowledgeBaseNode — retrieves relevant chunks via hybrid search (dense + sparse + RRF)."""
from __future__ import annotations

from typing import Any

from app.flow.base_node import BaseNode, NodeDefinition, NodeInput, NodeOutput
from app.flow.context import NodeExecutionContext
from app.flow.exceptions import NodeExecutionError
from app.flow.node_types import NodeCategory
from app.flow.registry import NodeRegistry

_DEFAULT_TOP_K = 5


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
            }
            for c in (raw_chunks or [])
        ]
        context = "\n\n".join(c["text"] for c in chunks if c["text"])

        return {"chunks": chunks, "context": context}
