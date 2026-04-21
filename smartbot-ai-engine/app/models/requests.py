from pydantic import BaseModel, Field, field_validator


class ProcessDocumentRequest(BaseModel):
    document_id: str = Field(..., min_length=1)
    knowledge_base_id: str = Field(..., min_length=1)
    tenant_id: str = Field(..., min_length=1)
    storage_path: str | None = None
    mime_type: str | None = None
    source_type: str  # file_upload | url_crawl | text_input
    source_url: str | None = None
    raw_text: str | None = None


class ReprocessDocumentRequest(BaseModel):
    knowledge_base_id: str = Field(..., min_length=1)
    markdown_storage_path: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    bot_id: str = Field(..., min_length=1)
    tenant_id: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    system_prompt: str = "Bạn là trợ lý AI hữu ích."
    knowledge_base_ids: list[str] = Field(default=[], max_length=10)
    top_k: int = Field(default=5, ge=1, le=20)
    memory_turns: int = Field(default=5, ge=1, le=20)
    conversation_history: list[dict] = []
    stream: bool = True

    @field_validator("knowledge_base_ids")
    @classmethod
    def validate_kb_ids(cls, v):
        for kb_id in v:
            if not kb_id or not kb_id.strip():
                raise ValueError("knowledge_base_ids must not contain empty strings")
        return v


class ChatTestRequest(BaseModel):
    message: str = Field(..., min_length=1)
    system_prompt: str = "Bạn là trợ lý AI hữu ích."
    knowledge_base_ids: list[str] = Field(default=[], max_length=10)
    top_k: int = Field(default=5, ge=1, le=20)

    @field_validator("knowledge_base_ids")
    @classmethod
    def validate_kb_ids(cls, v):
        for kb_id in v:
            if not kb_id or not kb_id.strip():
                raise ValueError("knowledge_base_ids must not contain empty strings")
        return v


class DeleteVectorsRequest(BaseModel):
    knowledge_base_id: str = Field(..., min_length=1)


class CreateCollectionRequest(BaseModel):
    knowledge_base_id: str = Field(..., min_length=1)
