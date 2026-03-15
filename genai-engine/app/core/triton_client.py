"""
TritonClient — adapted from vectordb_guide.py.

Communicates with Triton Inference Server to compute dense & sparse embeddings
using BAAI/bge-m3 model. Refactored to class-based with Settings injection.
"""

from collections import defaultdict

import numpy as np
import structlog
import tritonclient.http as httpclient
from transformers import AutoTokenizer

from app.config import Settings, settings

logger = structlog.get_logger()


class TritonClient:
    """Triton Inference Server client for computing embeddings."""

    def __init__(self, app_settings: Settings | None = None):
        s = app_settings or settings
        triton_host = s.TRITON_HOST
        if triton_host.startswith("http://"):
            triton_host = triton_host[7:]
        elif triton_host.startswith("https://"):
            triton_host = triton_host[8:]

        self.url = f"{triton_host}:{s.TRITON_PORT}"
        self.bs = s.TRITON_BATCH_SIZE
        self.model_name = s.TRITON_MODEL_NAME

        logger.info("triton_client_init", url=self.url, model=self.model_name)
        self.tokenizer = AutoTokenizer.from_pretrained(s.TOKENIZER_NAME)
        self.triton_client = httpclient.InferenceServerClient(url=self.url)

    def process_token_weights(
        self, token_weights: np.ndarray, input_ids: list
    ) -> dict:
        """
        Remove unused tokens (CLS, EOS, PAD, UNK) and aggregate sparse weights
        into a dict for BM25-style keyword search.
        """
        result: dict[str, float] = defaultdict(int)
        unused_tokens = {
            self.tokenizer.cls_token_id,
            self.tokenizer.eos_token_id,
            self.tokenizer.pad_token_id,
            self.tokenizer.unk_token_id,
        }
        for w, idx in zip(token_weights, input_ids):
            if idx not in unused_tokens and w > 0:
                idx_str = str(idx)
                if w > result[idx_str]:
                    result[idx_str] = float(w)
        return dict(result)

    def compute_vectors(
        self, texts: list[str]
    ) -> tuple[list[list[float]], list[dict]]:
        """
        Tokenize texts and send inference request to Triton.
        Returns (dense_vecs, sparse_vecs):
          - dense_vecs: list of 1024-dim float vectors
          - sparse_vecs: list of {token_id_str: weight} dicts
        """
        final_dense_vecs: list[list[float]] = []
        final_sparse_vecs: list[dict] = []
        if not texts:
            return final_dense_vecs, final_sparse_vecs

        n_batches = (len(texts) + self.bs - 1) // self.bs
        for batch_id in range(n_batches):
            sub_texts = texts[batch_id * self.bs : (batch_id + 1) * self.bs]
            inputs = self.tokenizer(
                sub_texts, padding=True, return_tensors="np", truncation=True
            )
            input_ids = inputs["input_ids"].astype(np.int64)
            attention_mask = inputs["attention_mask"].astype(np.int64)

            input_ids_tensor = httpclient.InferInput(
                "input_ids", input_ids.shape, "INT64"
            )
            input_ids_tensor.set_data_from_numpy(input_ids)
            attention_mask_tensor = httpclient.InferInput(
                "attention_mask", attention_mask.shape, "INT64"
            )
            attention_mask_tensor.set_data_from_numpy(attention_mask)

            response = self.triton_client.infer(
                self.model_name,
                inputs=[input_ids_tensor, attention_mask_tensor],
            )

            dense_vecs = response.as_numpy("dense_vecs")
            sparse_vecs = response.as_numpy("sparse_vecs")

            dense_vecs = [vec.tolist() for vec in dense_vecs]
            token_weights = sparse_vecs.squeeze(-1)
            sparse_vecs = list(
                map(
                    self.process_token_weights,
                    token_weights,
                    inputs["input_ids"].tolist(),
                )
            )

            final_dense_vecs.extend(dense_vecs)
            final_sparse_vecs.extend(sparse_vecs)

        return final_dense_vecs, final_sparse_vecs
