"""
RAGChat — full RAG chat flow.

Step 1: Query rewrite (fixed 3 turns, model small, backend-controlled)
Step 2: Hybrid retrieval (Qdrant dense+sparse, RRF fusion)
Step 3: LLM generation (model medium, user-configurable prompt/top_k/memory_turns)
"""

import structlog
from openai import OpenAI

from app.config import Settings, settings
from app.services.embedding_service import EmbeddingService
from app.services.query_rewriter import QueryRewriter

logger = structlog.get_logger()

RAG_SYSTEM_TEMPLATE = """{system_prompt}

Bạn trả lời câu hỏi dựa trên thông tin được cung cấp bên dưới.
Nếu thông tin không đủ để trả lời, hãy nói rõ rằng bạn không tìm thấy \
thông tin liên quan trong cơ sở tri thức.

---
Thông tin tham khảo:
{context}
---"""


class RAGChat:
    """Full RAG chat: rewrite → retrieve → generate (streaming or sync)."""

    def __init__(
        self,
        embedding_service: EmbeddingService,
        query_rewriter: QueryRewriter,
        app_settings: Settings | None = None,
    ):
        s = app_settings or settings
        self.rewriter = query_rewriter
        self.embedding = embedding_service
        self.llm = OpenAI(
            api_key=s.LLM_API_KEY,
            base_url=s.LLM_BASE_URL,
        )
        self.model = s.LLM_MODEL_MEDIUM

    def chat(
        self,
        message: str,
        system_prompt: str,
        knowledge_base_ids: list[str],
        conversation_history: list[dict],
        top_k: int = 5,
        memory_turns: int = 5,
        stream: bool = True,
    ):
        """
        Entry point for RAG chat.

        Returns (response, search_query, retrieval_context).
        - stream=True: response is a streaming generator
        - stream=False: response is a ChatCompletion object
        """
        # Step 1: Rewrite query (fixed 3 turns = 6 messages)
        search_query = self.rewriter.rewrite(
            message, conversation_history[-6:]
        )

        # Step 2: Retrieve from Qdrant
        collection_names = [f"kb_{kb_id}" for kb_id in knowledge_base_ids]
        retrieved_chunks = self.embedding.hybrid_search(
            query=search_query,
            collection_names=collection_names,
            top_k=top_k,
        )

        # Build context string and retrieval metadata
        context_parts = []
        retrieval_context = []
        for i, chunk in enumerate(retrieved_chunks):
            # Include breadcrumb in context if available
            breadcrumb = chunk.get("breadcrumb")
            if breadcrumb:
                context_parts.append(f"[{i + 1}] [{breadcrumb}]\n{chunk['content']}")
            else:
                context_parts.append(f"[{i + 1}] {chunk['content']}")

            retrieval_context.append(
                {
                    "document_id": chunk.get("document_id"),
                    "score": round(chunk.get("score_ranking", 0), 4),
                    "text_preview": chunk["content"][:200],
                    # New fields for UI display
                    "breadcrumb": breadcrumb,
                    "h1": chunk.get("h1"),
                    "h2": chunk.get("h2"),
                    "h3": chunk.get("h3"),
                }
            )

        context = (
            "\n\n".join(context_parts)
            if context_parts
            else "Không tìm thấy thông tin liên quan."
        )

        # Step 3: Build LLM messages & generate
        full_system = RAG_SYSTEM_TEMPLATE.format(
            system_prompt=system_prompt or "Bạn là trợ lý AI hữu ích.",
            context=context,
        )

        messages = [{"role": "system", "content": full_system}]

        # Memory: user-configurable turn count
        history_slice = conversation_history[-(memory_turns * 2) :]
        messages.extend(history_slice)
        messages.append({"role": "user", "content": message})

        logger.info(
            "rag_chat_request",
            search_query=search_query,
            chunks_found=len(retrieved_chunks),
            stream=stream,
        )

        response = self.llm.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=2048,
            temperature=0.7,
            stream=stream,
        )

        return response, search_query, retrieval_context
