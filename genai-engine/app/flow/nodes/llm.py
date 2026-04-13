"""LlmNode — streams LLM completions via langchain_openai, emits token SSE events."""
from __future__ import annotations

from typing import Any

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from app.flow.base_node import BaseNode, NodeDefinition, NodeInput, NodeOutput
from app.flow.context import NodeExecutionContext
from app.flow.exceptions import NodeExecutionError
from app.flow.node_types import NodeCategory
from app.flow.registry import NodeRegistry
from app.flow.schemas.execution_event import ExecutionEvent, ExecutionEventType

_VNPT_BASE_URL = "https://assistant-stream.vnpt.vn/v1/"
_DEFAULT_MODEL = "llm-large-v4"


def _resolve_credential(credentials: dict[str, dict], credential_id: str) -> dict[str, str]:
    cred = credentials.get(credential_id)
    if not cred:
        raise NodeExecutionError(f"LlmNode: credential '{credential_id}' not found")
    # Accept both camelCase (NestJS backend sends apiKey/baseUrl) and
    # snake_case (direct Python callers / tests). camelCase takes lower priority.
    normalized: dict[str, str] = {
        "api_key": cred.get("api_key") or cred.get("apiKey") or "",
        "base_url": cred.get("base_url") or cred.get("baseUrl") or "",
        "model": cred.get("model") or "",
    }
    if not normalized["api_key"]:
        raise NodeExecutionError(f"LlmNode: credential '{credential_id}' missing required 'api_key'")
    return normalized


@NodeRegistry.register
class LlmNode(BaseNode):
    definition = NodeDefinition(
        type="llm",
        category=NodeCategory.LLM,
        label="LLM",
        description=(
            "Streams a chat completion from an OpenAI-compatible LLM. "
            "Emits 'token' SSE events per chunk, then 'llm_call_completed' with token counts."
        ),
        icon="cpu",
        inputs=[
            NodeInput(name="prompt", type="string", required=True),
            NodeInput(name="system_prompt", type="string", required=False, default=""),
            NodeInput(name="model", type="string", required=False, default=_DEFAULT_MODEL),
            NodeInput(name="credential_id", type="string", required=True),
            NodeInput(name="temperature", type="number", required=False, default=0.7),
            NodeInput(name="max_tokens", type="number", required=False, default=2048),
        ],
        outputs=[
            NodeOutput(name="text", type="string"),
            NodeOutput(name="input_tokens", type="number"),
            NodeOutput(name="output_tokens", type="number"),
        ],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict[str, Any]:
        credential_id = ctx.resolve(ctx.inputs.get("credential_id", ""))
        cred = _resolve_credential(ctx.credentials, credential_id)

        prompt = ctx.resolve(ctx.inputs.get("prompt", ""))
        system_prompt = ctx.resolve(ctx.inputs.get("system_prompt", ""))
        model = ctx.resolve(ctx.inputs.get("model", "")) or cred["model"] or _DEFAULT_MODEL
        base_url = cred["base_url"] or _VNPT_BASE_URL
        temperature = float(ctx.inputs.get("temperature") or 0.7)
        max_tokens = int(ctx.inputs.get("max_tokens") or 2048)

        llm = ChatOpenAI(
            api_key=cred["api_key"],
            base_url=base_url,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            streaming=True,
        )

        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))

        full_text = ""
        input_tokens = 0
        output_tokens = 0

        async for chunk in llm.astream(messages):
            token_text = chunk.content or ""
            if token_text:
                full_text += token_text
                ctx.emit(ExecutionEvent(
                    type=ExecutionEventType.TOKEN,
                    node_id=ctx.node_id,
                    data={"token": token_text},
                ))
            # Accumulate usage metadata if available
            if hasattr(chunk, "usage_metadata") and chunk.usage_metadata:
                meta = chunk.usage_metadata
                input_tokens = getattr(meta, "input_tokens", 0) or input_tokens
                output_tokens = getattr(meta, "output_tokens", 0) or output_tokens

        ctx.emit(ExecutionEvent(
            type=ExecutionEventType.LLM_CALL_COMPLETED,
            node_id=ctx.node_id,
            data={
                "model": model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
            },
        ))

        return {
            "text": full_text,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
        }
