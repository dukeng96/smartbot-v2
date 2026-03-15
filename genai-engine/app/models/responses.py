from pydantic import BaseModel


class JobResponse(BaseModel):
    job_id: str
    status: str = "queued"


class CollectionResponse(BaseModel):
    collection_name: str
    created: bool


class DeleteCollectionResponse(BaseModel):
    deleted: bool


class DeleteVectorsResponse(BaseModel):
    deleted_chunks: int


class ChunkItem(BaseModel):
    content: str
    position: int
    char_count: int


class ChunksResponse(BaseModel):
    chunks: list[ChunkItem]
    total: int
    page: int


class RetrievalChunk(BaseModel):
    document_id: str | None = None
    score: float
    text_preview: str


class ChatNonStreamResponse(BaseModel):
    answer: str
    search_query: str
    retrieval_context: list[RetrievalChunk]
    input_tokens: int = 0
    output_tokens: int = 0


class HealthResponse(BaseModel):
    status: str
    triton: str
    qdrant: str
