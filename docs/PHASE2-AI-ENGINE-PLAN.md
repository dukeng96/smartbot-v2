# PHASE 2: AI Engine — Execution Plan

> **Mục tiêu:** Xây dựng service AI xử lý document ingestion (OCR → chunking → embedding → VectorDB) và RAG chat (query rewrite → hybrid retrieval → LLM generation với streaming). Service này chạy ĐỘC LẬP, giao tiếp với Web Backend (Phase 1) qua internal HTTP API.

---

## 1. Tech Stack

| Layer | Technology | Version | Ghi chú |
|-------|-----------|---------|---------|
| Runtime | Python | 3.11+ | |
| Framework | FastAPI | 0.115+ | Async, SSE native |
| Task Queue | Celery + Redis | Celery 5.4+ | Document processing jobs |
| Document Parse | Marker Cloud API | datalab-sdk | Pay-per-page, async polling |
| URL Extract | trafilatura | 1.12+ | Lightweight HTML→text |
| Text Chunking | langchain-text-splitters | 0.3+ | Chỉ module splitter |
| Embedding | Triton Inference Server | Có sẵn nội bộ | Model: BAAI/bge-m3 |
| Vector DB | Qdrant | Có sẵn nội bộ | Hybrid: dense + sparse |
| LLM | OpenAI SDK → VNPT self-host | openai 1.50+ | openai-compatible endpoint |
| Object Storage | S3 / MinIO | boto3 | Lưu file gốc + markdown extracted |
| Monitoring | structlog | | Structured JSON logging |

---

## 2. Project Structure

```
genai-engine/
├── docker-compose.yml          # Engine + Redis worker (Qdrant & Triton đã có sẵn)
├── .env.example
├── requirements.txt
├── Dockerfile
├── app/
│   ├── main.py                 # FastAPI app bootstrap
│   ├── config.py               # Settings from env
│   ├── dependencies.py         # DI: get embedding_service, get_llm_client
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── router.py           # Mount all routers
│   │   ├── documents.py        # POST /engine/v1/documents/process, GET status, DELETE vectors
│   │   ├── chat.py             # POST /engine/v1/chat/completions, /chat/test
│   │   ├── knowledge_bases.py  # POST /engine/v1/knowledge-bases (create/delete Qdrant collection)
│   │   └── health.py           # GET /health
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── document_processor.py   # Full pipeline: extract → chunk → embed → upsert
│   │   ├── text_extractor.py       # Marker Cloud API + trafilatura + plain text
│   │   ├── chunker.py              # RecursiveCharacterTextSplitter wrapper
│   │   ├── embedding_service.py    # Triton client + Qdrant handler (wrapper)
│   │   ├── rag_chat.py             # Query rewrite + retrieve + generate
│   │   ├── query_rewriter.py       # LLM small: rewrite search query
│   │   └── storage.py              # S3/MinIO upload/download
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── triton_client.py        # TritonClient class (adapted từ code mẫu)
│   │   ├── qdrant_handler.py       # QdrantHandler class (adapted từ code mẫu)
│   │   └── rrf.py                  # compute_rrf_scores function
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── requests.py             # Pydantic request models
│   │   └── responses.py            # Pydantic response models
│   │
│   └── worker/
│       ├── __init__.py
│       ├── celery_app.py           # Celery configuration
│       └── tasks.py                # Celery tasks: process_document
│
└── tests/
    ├── test_chunker.py
    ├── test_rag_chat.py
    ├── test_document_processor.py
    └── conftest.py
```

---

## 3. Configuration

```python
# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    
    # Triton (Embedding)
    TRITON_HOST: str = "10.159.19.40"
    TRITON_PORT: str = "31831"
    TRITON_BATCH_SIZE: int = 32
    TRITON_MODEL_NAME: str = "my_onnx_model"
    TOKENIZER_NAME: str = "BAAI/bge-m3"
    
    # Qdrant
    QDRANT_URL: str = "http://10.159.19.59:32500"
    QDRANT_API_KEY: str = "trungTamIcVnpt"
    QDRANT_ON_DISK: bool = True
    
    # LLM (VNPT self-host, openai-compatible)
    LLM_BASE_URL: str = "https://assistant-stream.vnpt.vn/v1/"
    LLM_API_KEY: str = ""
    LLM_MODEL_SMALL: str = "llm-small-v4"      # Query rewrite
    LLM_MODEL_MEDIUM: str = "llm-medium-v4"     # RAG generation
    
    # Marker Cloud API
    DATALAB_API_KEY: str = ""
    
    # MinIO
    MINIO_SERVICE_URL: str = "https://voice-storage.vnpt.vn"
    MINIO_ACCESS_KEY: str = ""
    MINIO_SECRET_KEY: str = ""
    MINIO_FOLDER_NAME: str = "genai-engine-data"
    MINIO_PUBLIC_HOST: str = "https://voice-storage.vnpt.vn"
    MINIO_EXPIRE_TIME: int = 168
    
    # Redis (for Celery)
    REDIS_URL: str = "redis://localhost:6379/1"
    
    # Web Backend callback URL (Phase 1)
    WEB_BACKEND_URL: str = "http://localhost:3000"
    WEB_BACKEND_INTERNAL_KEY: str = ""  # Shared secret for internal API calls
    
    class Config:
        env_file = ".env"

settings = Settings()
```

---

## 4. Core Components (Adapted from existing code)

### 4.1 TritonClient (`app/core/triton_client.py`)

Adapt từ code mẫu `vectordb_guide.py`. Thay đổi:
- Đọc config từ `Settings` thay vì global dict
- Method `compute_vectors(texts: list[str]) -> tuple[list[list[float]], list[dict]]`
- Singleton pattern qua FastAPI dependency injection

```python
# Key interface:
class TritonClient:
    def __init__(self, settings: Settings):
        self.url = f"{settings.TRITON_HOST}:{settings.TRITON_PORT}"
        self.bs = settings.TRITON_BATCH_SIZE
        self.tokenizer = AutoTokenizer.from_pretrained(settings.TOKENIZER_NAME)
        self.triton_client = httpclient.InferenceServerClient(url=self.url)
    
    def compute_vectors(self, texts: list[str]) -> tuple[list[list[float]], list[dict]]:
        """
        Input: list of text strings
        Output: (dense_vecs, sparse_vecs)
          - dense_vecs: list[list[float]] — each is 1024-dim dense vector
          - sparse_vecs: list[dict] — each is {token_id_str: weight}
        """
        # ... (giữ nguyên logic từ code mẫu, chỉ refactor structure)
```

### 4.2 QdrantHandler (`app/core/qdrant_handler.py`)

Adapt từ code mẫu `vectordb_guide.py`. Thay đổi:
- Thêm `document_id` vào payload khi upsert (để hỗ trợ xoá theo document)
- Thêm method `delete_by_document_id(collection, document_id)`
- Thêm method `delete_collection(collection)`
- Thêm method `create_collection_if_not_exists(collection)`

```python
# Key interface:
class QdrantHandler:
    def __init__(self, settings: Settings): ...
    
    def create_collection_if_not_exists(self, collection: str) -> bool: ...
    def delete_collection(self, collection: str) -> None: ...
    
    def upsert(self, entries: list[dict], collection: str) -> int:
        """
        Each entry: {
            id: str(uuid),
            dense_vec: list[float],
            sparse_vec: {indices: list[int], values: list[float]},
            content: str,
            document_id: str,   # ← THÊM MỚI so với code mẫu
            position: int,
        }
        Payload saved: {content, document_id, position}
        """
    
    def delete_by_document_id(self, collection: str, document_id: str) -> int:
        """Delete all points where payload.document_id matches."""
    
    def hybrid_search(self, query_dense: list[float], query_sparse: dict,
                      collection: str, limit: int = 200) -> tuple[list, list]:
        """Returns (dense_results, sparse_results) for RRF fusion."""
```

### 4.3 RRF (`app/core/rrf.py`)

Giữ nguyên `compute_rrf_scores` từ code mẫu `vectordb_guide.py`. Không thay đổi.

---

## 5. Services — Detailed Implementation

### 5.1 TextExtractor (`app/services/text_extractor.py`)

```python
from datalab_sdk import DatalabClient, ConvertOptions
import trafilatura
import boto3

class TextExtractor:
    """
    Extract text từ nhiều source types.
    - file_upload (PDF, DOCX, PPTX, XLSX, images, EPUB): → Marker Cloud API → Markdown
    - url_crawl: → trafilatura → plain text
    - text_input: → passthrough
    
    Output: markdown text string.
    Side effect: lưu markdown vào S3 để dùng lại khi re-chunk.
    """
    
    def __init__(self, settings: Settings):
        self.marker_client = DatalabClient(api_key=settings.DATALAB_API_KEY)
        self.s3 = boto3.client('s3',
            endpoint_url=settings.MINIO_SERVICE_URL,
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
        )
        self.bucket = settings.MINIO_FOLDER_NAME
    
    async def extract(self, source_type: str, storage_path: str = None,
                      source_url: str = None, raw_text: str = None,
                      mime_type: str = None) -> tuple[str, dict]:
        """
        Returns: (markdown_text, metadata)
        metadata: {page_count, quality_score, extraction_method}
        """
        if source_type == "text_input":
            return raw_text, {"extraction_method": "passthrough"}
        
        elif source_type == "url_crawl":
            downloaded = trafilatura.fetch_url(source_url)
            text = trafilatura.extract(downloaded, include_tables=True, include_links=True)
            if not text:
                raise ValueError(f"Could not extract content from URL: {source_url}")
            return text, {"extraction_method": "trafilatura", "source_url": source_url}
        
        elif source_type == "file_upload":
            # Download file từ MinIO to temp
            # Nếu là plain text (txt, csv) → đọc trực tiếp
            if mime_type in ["text/plain", "text/csv"]:
                obj = self.s3.get_object(Bucket=self.bucket, Key=storage_path)
                text = obj['Body'].read().decode('utf-8')
                return text, {"extraction_method": "direct_read"}
            
            # Nếu là PDF, DOCX, PPTX, etc. → gọi Marker Cloud API
            import tempfile, os
            with tempfile.NamedTemporaryFile(delete=False, suffix=self._get_ext(mime_type)) as tmp:
                self.s3.download_fileobj(self.bucket, storage_path, tmp)
                tmp_path = tmp.name
            
            try:
                options = ConvertOptions(
                    output_format="markdown",
                    mode="balanced",
                )
                result = self.marker_client.convert(tmp_path, options=options)
                metadata = {
                    "extraction_method": "marker",
                    "page_count": result.metadata.get("pages"),
                    "quality_score": getattr(result, 'parse_quality_score', None),
                }
                return result.markdown, metadata
            finally:
                os.unlink(tmp_path)
    
    def save_markdown_to_s3(self, document_id: str, markdown: str) -> str:
        """Lưu extracted markdown vào MinIO để re-chunk sau này không cần gọi lại Marker."""
        key = f"markdown/{document_id}.md"
        self.s3.put_object(Bucket=self.bucket, Key=key, Body=markdown.encode('utf-8'))
        return key
    
    def load_markdown_from_s3(self, markdown_path: str) -> str:
        """Load markdown đã extract (dùng khi reprocess/re-chunk)."""
        obj = self.s3.get_object(Bucket=self.bucket, Key=markdown_path)
        return obj['Body'].read().decode('utf-8')
    
    @staticmethod
    def _get_ext(mime_type: str) -> str:
        mapping = {
            "application/pdf": ".pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
            "image/png": ".png", "image/jpeg": ".jpg",
        }
        return mapping.get(mime_type, ".bin")
```

### 5.2 Chunker (`app/services/chunker.py`)

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

class Chunker:
    """
    Split markdown text into chunks for embedding.
    Separators ưu tiên cấu trúc Markdown (output của Marker).
    """
    
    MARKDOWN_SEPARATORS = [
        "\n# ",       # H1
        "\n## ",      # H2
        "\n### ",     # H3
        "\n#### ",    # H4
        "\n\n",       # Paragraph break
        "\n",         # Line break
        ". ",         # Sentence end
        " ",          # Word (last resort)
    ]
    
    def chunk(self, text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> list[dict]:
        """
        Input: markdown text, chunk config
        Output: list of {content: str, position: int, char_count: int}
        """
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=self.MARKDOWN_SEPARATORS,
            length_function=len,
        )
        
        chunks = splitter.split_text(text)
        
        return [
            {
                "content": chunk,
                "position": i,
                "char_count": len(chunk),
            }
            for i, chunk in enumerate(chunks)
        ]
```

### 5.3 EmbeddingService (`app/services/embedding_service.py`)

```python
import uuid
from app.core.triton_client import TritonClient
from app.core.qdrant_handler import QdrantHandler
from app.core.rrf import compute_rrf_scores

class EmbeddingService:
    """Orchestrate embedding + Qdrant operations."""
    
    def __init__(self, triton: TritonClient, qdrant: QdrantHandler):
        self.triton = triton
        self.qdrant = qdrant
    
    def ensure_collection(self, collection_name: str):
        self.qdrant.create_collection_if_not_exists(collection_name)
    
    def embed_and_upsert(self, chunks: list[dict], collection_name: str,
                         document_id: str) -> int:
        """Embed chunks → upsert vào Qdrant. Return chunk count."""
        texts = [c["content"] for c in chunks]
        if not texts:
            return 0
        
        dense_vecs, sparse_vecs = self.triton.compute_vectors(texts)
        
        entries = []
        for i, chunk in enumerate(chunks):
            indices = list(sparse_vecs[i].keys())
            values = list(sparse_vecs[i].values())
            entries.append({
                "id": str(uuid.uuid4()),
                "dense_vec": dense_vecs[i],
                "sparse_vec": {"indices": indices, "values": values},
                "content": chunk["content"],
                "document_id": document_id,
                "position": chunk["position"],
            })
        
        self.qdrant.upsert(entries, collection=collection_name)
        return len(entries)
    
    def delete_document_vectors(self, collection_name: str, document_id: str) -> int:
        return self.qdrant.delete_by_document_id(collection_name, document_id)
    
    def delete_collection(self, collection_name: str):
        self.qdrant.delete_collection(collection_name)
    
    def hybrid_search(self, query: str, collection_names: list[str],
                      top_k: int = 5) -> list[dict]:
        """
        Hybrid search across multiple collections, merge bằng RRF.
        Returns: list of {content, document_id, score_ranking, score_dense, score_sparse}
        """
        query_dense, query_sparse = self.triton.compute_vectors([query])
        dense_vec = query_dense[0]
        sparse_vec = query_sparse[0]
        
        all_results = []
        for collection_name in collection_names:
            try:
                dense_results, sparse_results = self.qdrant.hybrid_search(
                    query_dense=dense_vec,
                    query_sparse=sparse_vec,
                    collection=collection_name,
                    limit=top_k * 3,
                )
                rrf = compute_rrf_scores(dense_results, sparse_results, top_k=top_k)
                for doc_id, info in rrf.items():
                    info["_qdrant_id"] = doc_id
                    info["collection"] = collection_name
                    all_results.append(info)
            except Exception as e:
                # Collection might not exist yet or be empty
                print(f"Warning: search failed for {collection_name}: {e}")
                continue
        
        all_results.sort(key=lambda x: x["score_ranking"], reverse=True)
        return all_results[:top_k]
```

### 5.4 QueryRewriter (`app/services/query_rewriter.py`)

```python
from openai import OpenAI
from app.config import settings

REWRITE_SYSTEM_PROMPT = """Bạn là module viết lại câu hỏi tìm kiếm.
Nhiệm vụ: Dựa vào lịch sử hội thoại gần nhất, viết lại câu hỏi hiện tại 
thành câu truy vấn tìm kiếm ĐỘC LẬP, đầy đủ ngữ cảnh.

Quy tắc:
- Nếu câu hỏi đã rõ ràng và độc lập → giữ nguyên
- Nếu có đại từ (nó, anh ấy, cái đó...) → thay bằng danh từ cụ thể từ ngữ cảnh
- Chỉ trả về câu truy vấn viết lại, KHÔNG giải thích
- Giữ ngôn ngữ gốc của user"""

class QueryRewriter:
    """
    Bước 1 trong RAG flow (fix cứng, user KHÔNG config được).
    - Fix cứng 3 turn gần nhất làm context
    - Dùng LLM model small
    - Temperature 0.1 (deterministic)
    """
    
    def __init__(self):
        self.client = OpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_BASE_URL,
        )
        self.model = settings.LLM_MODEL_SMALL
    
    def rewrite(self, user_message: str, recent_history: list[dict]) -> str:
        """
        Input:
          - user_message: câu hỏi hiện tại
          - recent_history: fix cứng 6 messages gần nhất (3 user + 3 assistant)
        Output: search query đã rewrite
        """
        # Không có history → giữ nguyên
        last_6 = recent_history[-6:]
        if not last_6:
            return user_message
        
        history_text = "\n".join([
            f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}"
            for m in last_6
        ])
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": REWRITE_SYSTEM_PROMPT},
                    {"role": "user", "content": (
                        f"Lịch sử hội thoại:\n{history_text}\n\n"
                        f"Câu hỏi hiện tại: {user_message}\n\n"
                        f"Câu truy vấn tìm kiếm viết lại:"
                    )}
                ],
                max_tokens=256,
                temperature=0.1,
            )
            rewritten = response.choices[0].message.content.strip()
            return rewritten if rewritten else user_message
        except Exception as e:
            print(f"Query rewrite failed, using original: {e}")
            return user_message
```

### 5.5 RAGChat (`app/services/rag_chat.py`)

```python
from openai import OpenAI
from app.config import settings
from app.services.query_rewriter import QueryRewriter
from app.services.embedding_service import EmbeddingService

RAG_SYSTEM_TEMPLATE = """{system_prompt}

Bạn trả lời câu hỏi dựa trên thông tin được cung cấp bên dưới.
Nếu thông tin không đủ để trả lời, hãy nói rõ rằng bạn không tìm thấy 
thông tin liên quan trong cơ sở tri thức.

---
Thông tin tham khảo:
{context}
---"""

class RAGChat:
    """
    Full RAG chat flow:
      Step 1: Query rewrite (fix cứng 3 turn, model small, backend control)
      Step 2: Hybrid retrieval (Qdrant, RRF)
      Step 3: LLM generate (model medium, user config prompt/topK/memoryTurns)
    """
    
    def __init__(self, embedding_service: EmbeddingService):
        self.rewriter = QueryRewriter()
        self.embedding = embedding_service
        self.llm = OpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_BASE_URL,
        )
        self.model = settings.LLM_MODEL_MEDIUM
    
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
        Entry point. Returns (stream_or_result, search_query, retrieval_context).
        
        If stream=True: returns (generator, search_query, retrieval_context)
        If stream=False: returns (dict, search_query, retrieval_context)
        """
        # Step 1: Rewrite query (fix cứng 3 turn = 6 messages)
        search_query = self.rewriter.rewrite(message, conversation_history[-6:])
        
        # Step 2: Retrieve
        collection_names = [f"kb_{kb_id}" for kb_id in knowledge_base_ids]
        retrieved_chunks = self.embedding.hybrid_search(
            query=search_query,
            collection_names=collection_names,
            top_k=top_k,
        )
        
        # Build context
        context_parts = []
        retrieval_context = []
        for i, chunk in enumerate(retrieved_chunks):
            context_parts.append(f"[{i+1}] {chunk['content']}")
            retrieval_context.append({
                "document_id": chunk.get("document_id"),
                "score": round(chunk.get("score_ranking", 0), 4),
                "text_preview": chunk["content"][:200],
            })
        
        context = "\n\n".join(context_parts) if context_parts else "Không tìm thấy thông tin liên quan."
        
        # Step 3: Build messages & generate
        full_system = RAG_SYSTEM_TEMPLATE.format(
            system_prompt=system_prompt or "Bạn là trợ lý AI hữu ích.",
            context=context,
        )
        
        messages = [{"role": "system", "content": full_system}]
        
        # Memory: user config số turn
        history_slice = conversation_history[-(memory_turns * 2):]
        messages.extend(history_slice)
        messages.append({"role": "user", "content": message})
        
        response = self.llm.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=2048,
            temperature=0.7,
            stream=stream,
        )
        
        return response, search_query, retrieval_context
```

### 5.6 DocumentProcessor (`app/services/document_processor.py`)

```python
from app.services.text_extractor import TextExtractor
from app.services.chunker import Chunker
from app.services.embedding_service import EmbeddingService
import httpx

class DocumentProcessor:
    """
    Full document processing pipeline:
    1. Extract text (Marker Cloud / trafilatura / direct read)
    2. Save markdown to MinIO (for re-chunking later)
    3. Chunk text
    4. Embed + upsert to Qdrant
    5. Callback to Web Backend with results
    """
    
    def __init__(self, extractor: TextExtractor, chunker: Chunker,
                 embedding: EmbeddingService, settings):
        self.extractor = extractor
        self.chunker = chunker
        self.embedding = embedding
        self.callback_url = settings.WEB_BACKEND_URL
        self.callback_key = settings.WEB_BACKEND_INTERNAL_KEY
    
    async def process(self, document_id: str, knowledge_base_id: str,
                      tenant_id: str, storage_path: str, mime_type: str,
                      source_type: str, source_url: str = None,
                      raw_text: str = None,
                      chunk_size: int = 500, chunk_overlap: int = 50):
        """
        Full pipeline. Called by Celery worker.
        Updates status via callback to Web Backend.
        """
        collection_name = f"kb_{knowledge_base_id}"
        
        try:
            # Step 1: Extract
            await self._update_status(document_id, "extracting", 10)
            
            markdown_text, metadata = await self.extractor.extract(
                source_type=source_type,
                storage_path=storage_path,
                source_url=source_url,
                raw_text=raw_text,
                mime_type=mime_type,
            )
            
            # Save markdown to MinIO for re-chunking
            markdown_path = self.extractor.save_markdown_to_s3(document_id, markdown_text)
            
            await self._update_status(document_id, "chunking", 40,
                                      extra={"markdown_storage_path": markdown_path})
            
            # Step 2: Chunk
            chunks = self.chunker.chunk(markdown_text, chunk_size, chunk_overlap)
            
            if not chunks:
                await self._update_status(document_id, "completed", 100,
                                          extra={"char_count": 0, "chunk_count": 0})
                return
            
            await self._update_status(document_id, "embedding", 60)
            
            # Step 3: Ensure Qdrant collection exists
            self.embedding.ensure_collection(collection_name)
            
            # Step 4: Embed + upsert
            chunk_count = self.embedding.embed_and_upsert(
                chunks=chunks,
                collection_name=collection_name,
                document_id=document_id,
            )
            
            total_chars = sum(c["char_count"] for c in chunks)
            
            # Step 5: Callback success
            await self._update_status(document_id, "completed", 100, extra={
                "char_count": total_chars,
                "chunk_count": chunk_count,
                "metadata": metadata,
            })
            
        except Exception as e:
            await self._update_status(document_id, "error", 0, extra={
                "error_message": str(e),
            })
            raise
    
    async def reprocess(self, document_id: str, knowledge_base_id: str,
                        markdown_storage_path: str,
                        chunk_size: int = 500, chunk_overlap: int = 50):
        """
        Re-chunk từ markdown đã lưu trên MinIO.
        Không gọi lại Marker API → miễn phí + nhanh.
        """
        collection_name = f"kb_{knowledge_base_id}"
        
        # 1. Delete old vectors
        self.embedding.delete_document_vectors(collection_name, document_id)
        
        # 2. Load markdown from MinIO
        markdown_text = self.extractor.load_markdown_from_s3(markdown_storage_path)
        
        # 3. Re-chunk
        chunks = self.chunker.chunk(markdown_text, chunk_size, chunk_overlap)
        
        # 4. Re-embed + upsert
        chunk_count = self.embedding.embed_and_upsert(chunks, collection_name, document_id)
        total_chars = sum(c["char_count"] for c in chunks)
        
        await self._update_status(document_id, "completed", 100, extra={
            "char_count": total_chars,
            "chunk_count": chunk_count,
        })
    
    async def _update_status(self, document_id: str, status: str, progress: int,
                             extra: dict = None):
        """Callback to Web Backend to update document status."""
        payload = {
            "status": status,
            "processing_step": status if status not in ("completed", "error") else None,
            "processing_progress": progress,
            **(extra or {}),
        }
        try:
            async with httpx.AsyncClient() as client:
                await client.patch(
                    f"{self.callback_url}/api/v1/internal/documents/{document_id}/status",
                    json=payload,
                    headers={"X-Internal-Key": self.callback_key},
                    timeout=10,
                )
        except Exception as e:
            print(f"Callback failed for {document_id}: {e}")
```

---

## 6. API Routes

### 6.1 Health Check

```
GET /health
  Response: {"status": "ok", "triton": "connected", "qdrant": "connected"}
```

### 6.2 Knowledge Base Management

```
POST /engine/v1/knowledge-bases
  Input: {knowledge_base_id: str}
  Action: Create Qdrant collection "kb_{knowledge_base_id}"
  Response: {collection_name: str, created: bool}

DELETE /engine/v1/knowledge-bases/{knowledge_base_id}
  Action: Delete Qdrant collection
  Response: {deleted: bool}
```

### 6.3 Document Processing

```
POST /engine/v1/documents/process
  Input: {
    document_id: str,
    knowledge_base_id: str,
    tenant_id: str,
    storage_path: str | null,
    mime_type: str | null,
    source_type: "file_upload" | "url_crawl" | "text_input",
    source_url: str | null,
    raw_text: str | null,
    chunk_size: int = 500,
    chunk_overlap: int = 50,
  }
  Action: Queue Celery task
  Response: {job_id: str, status: "queued"}

POST /engine/v1/documents/{document_id}/reprocess
  Input: {
    knowledge_base_id: str,
    markdown_storage_path: str,
    chunk_size: int,
    chunk_overlap: int,
  }
  Action: Queue Celery reprocess task (re-chunk from saved markdown)
  Response: {job_id: str, status: "queued"}

DELETE /engine/v1/documents/{document_id}/vectors
  Input: {knowledge_base_id: str}
  Action: Delete vectors by document_id filter
  Response: {deleted_chunks: int}

GET /engine/v1/documents/{document_id}/chunks?page=1&limit=20
  Description: Preview chunks (query Qdrant by document_id filter)
  Response: {
    chunks: [{content, position, char_count}],
    total: int,
    page: int
  }
```

### 6.4 Chat

```
POST /engine/v1/chat/completions
  Input: {
    bot_id: str,
    tenant_id: str,
    message: str,
    system_prompt: str,
    knowledge_base_ids: list[str],
    top_k: int = 5,
    memory_turns: int = 5,
    conversation_history: list[{role: str, content: str}],
    stream: bool = true,
  }
  
  Response (stream=true): SSE events
    event: message_start
    data: {"message_id": "uuid"}
    
    event: retrieval
    data: {"search_query": "...", "chunks": [{document_id, score, text_preview}]}
    
    event: delta
    data: {"content": "partial text"}
    
    event: message_end
    data: {"input_tokens": N, "output_tokens": N}
  
  Response (stream=false): {
    answer: str,
    search_query: str,
    retrieval_context: [{document_id, score, text_preview}],
    input_tokens: int,
    output_tokens: int,
  }

POST /engine/v1/chat/test
  Description: Quick test, không qua conversation logic
  Input: {
    message: str,
    system_prompt: str,
    knowledge_base_ids: list[str],
    top_k: int = 5,
  }
  Response: {
    answer: str,
    search_query: str,
    retrieval_context: [{document_id, score, text_preview}],
  }
```

---

## 7. Celery Worker

```python
# app/worker/celery_app.py
from celery import Celery
from app.config import settings

celery_app = Celery(
    "genai-engine",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,  # 1 task at a time per worker (GPU bound)
)

# app/worker/tasks.py
from app.worker.celery_app import celery_app
from app.services.document_processor import DocumentProcessor
# ... initialize services

@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def process_document_task(self, **kwargs):
    """Async document processing task."""
    try:
        import asyncio
        asyncio.run(processor.process(**kwargs))
    except Exception as exc:
        self.retry(exc=exc)

@celery_app.task(bind=True, max_retries=2)
def reprocess_document_task(self, **kwargs):
    """Re-chunk from saved markdown."""
    import asyncio
    asyncio.run(processor.reprocess(**kwargs))
```

---

## 8. Pydantic Models

```python
# app/models/requests.py
from pydantic import BaseModel, Field

class ProcessDocumentRequest(BaseModel):
    document_id: str
    knowledge_base_id: str
    tenant_id: str
    storage_path: str | None = None
    mime_type: str | None = None
    source_type: str  # file_upload | url_crawl | text_input
    source_url: str | None = None
    raw_text: str | None = None
    chunk_size: int = Field(default=500, ge=100, le=5000)
    chunk_overlap: int = Field(default=50, ge=0, le=500)

class ReprocessDocumentRequest(BaseModel):
    knowledge_base_id: str
    markdown_storage_path: str
    chunk_size: int = 500
    chunk_overlap: int = 50

class ChatRequest(BaseModel):
    bot_id: str
    tenant_id: str
    message: str
    system_prompt: str | None = "Bạn là trợ lý AI hữu ích."
    knowledge_base_ids: list[str] = []
    top_k: int = Field(default=5, ge=1, le=20)
    memory_turns: int = Field(default=5, ge=1, le=20)
    conversation_history: list[dict] = []
    stream: bool = True

class ChatTestRequest(BaseModel):
    message: str
    system_prompt: str | None = "Bạn là trợ lý AI hữu ích."
    knowledge_base_ids: list[str] = []
    top_k: int = Field(default=5, ge=1, le=20)

class DeleteVectorsRequest(BaseModel):
    knowledge_base_id: str

class CreateCollectionRequest(BaseModel):
    knowledge_base_id: str
```

---

## 9. Environment Variables

```env
# Triton
TRITON_HOST=10.159.19.40
TRITON_PORT=31831
TRITON_BATCH_SIZE=32
TOKENIZER_NAME=BAAI/bge-m3

# Qdrant
QDRANT_URL=http://10.159.19.59:32500
QDRANT_API_KEY=trungTamIcVnpt
QDRANT_ON_DISK=true

# LLM
LLM_BASE_URL=https://assistant-stream.vnpt.vn/v1/
LLM_API_KEY=your-api-key
LLM_MODEL_SMALL=llm-small-v4
LLM_MODEL_MEDIUM=llm-medium-v4

# Marker
DATALAB_API_KEY=your-datalab-api-key

# MinIO
MINIO_SERVICE_URL=https://voice-storage.vnpt.vn
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_FOLDER_NAME=smartbot-v2
MINIO_PUBLIC_HOST=https://voice-storage.vnpt.vn
MINIO_EXPIRE_TIME=168

# Redis
REDIS_URL=redis://localhost:6379/1

# Web Backend
WEB_BACKEND_URL=http://localhost:3000
WEB_BACKEND_INTERNAL_KEY=shared-secret-key

# Server
HOST=0.0.0.0
PORT=8000
```

---

## 10. Docker Compose

```yaml
version: '3.8'
services:
  engine:
    build: .
    ports: ["8000:8000"]
    env_file: .env
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    depends_on: [redis]

  worker:
    build: .
    env_file: .env
    command: celery -A app.worker.celery_app worker --loglevel=info --concurrency=2
    depends_on: [redis]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

# NOTE: Qdrant và Triton chạy trên infra riêng (đã có sẵn)
# Không cần include trong docker-compose này
```

---

## 11. Implementation Order

1. **Project init**: FastAPI skeleton, config, health check
2. **Core adapters**: Refactor TritonClient + QdrantHandler từ code mẫu → class-based với DI
3. **Chunker**: Implement + unit test với sample markdown
4. **TextExtractor**: Marker Cloud integration + trafilatura + MinIO save
5. **EmbeddingService**: Wrap triton+qdrant, test embed_and_upsert + hybrid_search
6. **Document processing API**: POST /documents/process + Celery task + callback
7. **QueryRewriter**: Implement + test with LLM small
8. **RAGChat**: Full flow rewrite→retrieve→generate + SSE streaming
9. **Chat API**: POST /chat/completions with SSE, POST /chat/test
10. **Reprocess**: POST /documents/reprocess (re-chunk from saved markdown)
11. **Integration test**: Upload doc → wait processed → chat → verify RAG response
12. **Docker compose**: Engine + worker containerized

---

## 12. Internal API Contract between Phase 1 ↔ Phase 2

Phase 1 (Web Backend) calls Phase 2 (AI Engine) via HTTP. Auth: `X-Internal-Key` header.

**Phase 1 → Phase 2:**
- `POST /engine/v1/knowledge-bases` — khi tạo KB
- `DELETE /engine/v1/knowledge-bases/{id}` — khi xoá KB
- `POST /engine/v1/documents/process` — khi upload document
- `POST /engine/v1/documents/{id}/reprocess` — khi re-process
- `DELETE /engine/v1/documents/{id}/vectors` — khi xoá document
- `POST /engine/v1/chat/completions` — khi user chat (SSE proxy)
- `POST /engine/v1/chat/test` — khi test trên platform

**Phase 2 → Phase 1 (callback):**
- `PATCH /api/v1/internal/documents/{id}/status` — update processing status

Phase 1 cần implement 1 internal route:
```
PATCH /api/v1/internal/documents/:id/status
  Auth: X-Internal-Key header
  Body: {status, processing_step, processing_progress, char_count?, chunk_count?,
         markdown_storage_path?, error_message?, metadata?}
```
