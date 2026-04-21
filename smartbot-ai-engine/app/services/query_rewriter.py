"""
QueryRewriter — Step 1 in the RAG flow (fixed, NOT user-configurable).

- Fixed 3 recent turns (6 messages) as context
- Uses LLM model small
- Temperature 0.1 (deterministic)
"""

import structlog
from openai import OpenAI

from app.config import Settings, settings

logger = structlog.get_logger()

REWRITE_SYSTEM_PROMPT = """Bạn là module viết lại câu hỏi tìm kiếm.
Nhiệm vụ: Dựa vào lịch sử hội thoại gần nhất, viết lại câu hỏi hiện tại \
thành câu truy vấn tìm kiếm ĐỘC LẬP, đầy đủ ngữ cảnh.

Quy tắc:
- Nếu câu hỏi đã rõ ràng và độc lập → giữ nguyên
- Nếu có đại từ (nó, anh ấy, cái đó...) → thay bằng danh từ cụ thể từ ngữ cảnh
- Chỉ trả về câu truy vấn viết lại, KHÔNG giải thích
- Giữ ngôn ngữ gốc của user"""


class QueryRewriter:
    """Rewrite user query with conversation context for better retrieval."""

    def __init__(self, app_settings: Settings | None = None):
        s = app_settings or settings
        self.client = OpenAI(
            api_key=s.LLM_API_KEY,
            base_url=s.LLM_BASE_URL,
        )
        self.model = s.LLM_MODEL_SMALL

    def rewrite(self, user_message: str, recent_history: list[dict]) -> str:
        """
        Rewrite user_message using last 6 messages (3 turns) as context.
        Returns the rewritten search query.
        """
        last_6 = recent_history[-6:]
        if not last_6:
            return user_message

        history_text = "\n".join(
            f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
            for m in last_6
        )

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": REWRITE_SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": (
                            f"Lịch sử hội thoại:\n{history_text}\n\n"
                            f"Câu hỏi hiện tại: {user_message}\n\n"
                            f"Câu truy vấn tìm kiếm viết lại:"
                        ),
                    },
                ],
                max_tokens=256,
                temperature=0.1,
            )
            rewritten = response.choices[0].message.content.strip()
            logger.debug(
                "query_rewritten",
                original=user_message,
                rewritten=rewritten,
            )
            return rewritten if rewritten else user_message
        except Exception as e:
            logger.warning("query_rewrite_failed", error=str(e))
            return user_message
