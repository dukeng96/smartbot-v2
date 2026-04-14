"""AgentNode — tool-calling agent loop via langchain.agents.create_agent."""
from __future__ import annotations

import asyncio
from typing import Any

from langchain.agents import create_agent
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import StructuredTool
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, create_model

from app.flow.base_node import BaseNode, NodeDefinition, NodeInput, NodeOutput
from app.flow.context import NodeExecutionContext
from app.flow.exceptions import NodeExecutionError
from app.flow.node_types import NodeCategory
from app.flow.registry import NodeRegistry
from app.flow.sandbox import run_code
from app.flow.schemas.execution_event import ExecutionEvent, ExecutionEventType

_VNPT_BASE_URL = "https://assistant-stream.vnpt.vn/v1/"
_DEFAULT_MODEL = "llm-large-v4"

# JSON Schema primitive type → Python type mapping for dynamic Pydantic model
_SCHEMA_TYPE_MAP: dict[str, type] = {
    "string": str,
    "number": float,
    "integer": int,
    "boolean": bool,
}


def _json_schema_to_pydantic(schema: dict[str, Any]) -> type[BaseModel]:
    """Build a Pydantic model from a flat JSON Schema properties dict."""
    properties: dict[str, Any] = schema.get("properties", {})
    required: list[str] = schema.get("required", [])
    fields: dict[str, Any] = {}

    for prop_name, prop_def in properties.items():
        py_type = _SCHEMA_TYPE_MAP.get(prop_def.get("type", ""), Any)
        if prop_name in required:
            fields[prop_name] = (py_type, ...)
        else:
            fields[prop_name] = (py_type, None)

    return create_model("ToolArgs", **fields)  # type: ignore[call-overload]


async def _fetch_tool_def(tool_id: str, tenant_id: str | None) -> dict[str, Any]:
    import httpx
    from app.config import settings

    url = f"{settings.WEB_BACKEND_URL}/internal/custom-tools/{tool_id}"
    headers: dict[str, str] = {"X-Internal-Key": settings.WEB_BACKEND_INTERNAL_KEY}
    if tenant_id:
        headers["X-Tenant-Id"] = tenant_id

    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(url, headers=headers)

    if resp.status_code == 404:
        raise NodeExecutionError(f"CustomTool '{tool_id}' not found")
    if not resp.is_success:
        raise NodeExecutionError(f"Failed to fetch tool '{tool_id}': HTTP {resp.status_code}")
    return resp.json()


def _build_lc_tool(tool_def: dict[str, Any]) -> StructuredTool:
    """Wrap a CustomTool definition as a LangChain StructuredTool."""
    schema = tool_def.get("schema") or {}
    impl = tool_def["implementation"]

    def _invoke(**kwargs: Any) -> str:
        result = run_code(impl, inputs=kwargs, timeout_sec=5.0)
        if result.error:
            raise ValueError(result.error)
        return str(result.output)

    args_schema = _json_schema_to_pydantic(schema)

    return StructuredTool.from_function(
        func=_invoke,
        name=tool_def["name"],
        description=tool_def.get("description") or tool_def["name"],
        args_schema=args_schema,
    )


def _resolve_credential(credentials: dict[str, dict], credential_id: str) -> dict[str, str]:
    cred = credentials.get(credential_id)
    if not cred:
        raise NodeExecutionError(f"AgentNode: credential '{credential_id}' not found")
    normalized = {
        "api_key": cred.get("api_key") or cred.get("apiKey") or "",
        "base_url": cred.get("base_url") or cred.get("baseUrl") or "",
        "model": cred.get("model") or "",
    }
    if not normalized["api_key"]:
        raise NodeExecutionError(f"AgentNode: credential '{credential_id}' missing 'api_key'")
    return normalized


@NodeRegistry.register
class AgentNode(BaseNode):
    definition = NodeDefinition(
        type="agent",
        category=NodeCategory.AGENT,
        label="Agent",
        description=(
            "LangChain tool-calling agent loop. Fetches CustomTool definitions from the "
            "backend, binds them as LangChain tools, and streams tool_call/tool_result events."
        ),
        icon="bot",
        inputs=[
            NodeInput(name="credential_id", type="string", required=True),
            NodeInput(name="model", type="string", required=False, default=_DEFAULT_MODEL,
                      enum=["llm-small-v4", "llm-medium-v4", "llm-large-v4"]),
            NodeInput(name="messages", type="array", required=True),
            NodeInput(name="tools", type="array", required=False, default=[]),
            NodeInput(name="max_iterations", type="number", required=False, default=5),
            NodeInput(name="memory_enabled", type="boolean", required=False, default=False),
            NodeInput(name="memory_window", type="number", required=False, default=5),
            NodeInput(name="return_response_as", type="string", required=False, default="flow_state",
                      enum=["flow_state", "assistant_message"]),
        ],
        outputs=[
            NodeOutput(name="response", type="string"),
            NodeOutput(name="tool_calls", type="array"),
        ],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict[str, Any]:
        credential_id = ctx.resolve(ctx.inputs.get("credential_id", ""))
        cred = _resolve_credential(ctx.credentials, credential_id)

        model = ctx.resolve(ctx.inputs.get("model", "")) or cred["model"] or _DEFAULT_MODEL
        base_url = cred["base_url"] or _VNPT_BASE_URL
        max_iterations = int(ctx.inputs.get("max_iterations") or 5)
        max_iterations = min(max_iterations, 15)  # hard cap per spec
        memory_enabled = bool(ctx.inputs.get("memory_enabled", False))
        memory_window = int(ctx.inputs.get("memory_window") or 5)
        return_as = ctx.resolve(ctx.inputs.get("return_response_as", "flow_state"))

        # Build LangChain messages from node inputs
        raw_messages: list[dict[str, str]] = ctx.inputs.get("messages") or []
        lc_messages = []

        if memory_enabled:
            history: list[dict[str, str]] = ctx.state.get("history", [])
            for h in history[-memory_window * 2:]:
                role = h.get("role", "user")
                content = h.get("content", "")
                if role == "system":
                    lc_messages.append(SystemMessage(content=content))
                elif role == "assistant":
                    lc_messages.append(AIMessage(content=content))
                else:
                    lc_messages.append(HumanMessage(content=content))

        for msg in raw_messages:
            role = msg.get("role", "user")
            content = ctx.resolve(msg.get("content", ""))
            if role == "system":
                lc_messages.append(SystemMessage(content=content))
            elif role == "assistant":
                lc_messages.append(AIMessage(content=content))
            else:
                lc_messages.append(HumanMessage(content=content))

        # Resolve system prompt from messages for create_agent
        system_prompt = None
        non_system = []
        for msg in lc_messages:
            if isinstance(msg, SystemMessage):
                system_prompt = msg.content
            else:
                non_system.append(msg)

        # Build LangChain tools from tool IDs
        tool_ids: list[str] = ctx.inputs.get("tools") or []
        lc_tools: list[StructuredTool] = []
        for tool_id in tool_ids:
            resolved_id = ctx.resolve(tool_id) if isinstance(tool_id, str) else tool_id
            try:
                tool_def = await _fetch_tool_def(resolved_id, ctx.tenant_id)
                lc_tools.append(_build_lc_tool(tool_def))
            except NodeExecutionError:
                raise
            except Exception as exc:
                raise NodeExecutionError(f"AgentNode: failed to load tool '{resolved_id}': {exc}") from exc

        llm = ChatOpenAI(
            api_key=cred["api_key"],
            base_url=base_url,
            model=model,
            streaming=True,
        )

        agent_graph = create_agent(
            model=llm,
            tools=lc_tools,
            system_prompt=system_prompt,
        )

        # recursion_limit maps max_iterations; each agent step = 2 graph nodes (agent + tool)
        config = {"recursion_limit": max_iterations * 2 + 1}

        final_response = ""
        tool_calls_made: list[dict[str, Any]] = []

        try:
            async for chunk in agent_graph.astream(
                {"messages": non_system},
                config=config,
                stream_mode="updates",
            ):
                for _node_name, node_update in chunk.items():
                    messages = node_update.get("messages", []) if isinstance(node_update, dict) else []
                    for msg in messages:
                        if isinstance(msg, AIMessage):
                            # Emit tool_call events for each pending tool call
                            for tc in (msg.tool_calls or []):
                                ctx.emit(ExecutionEvent(
                                    type=ExecutionEventType.TOOL_CALL,
                                    node_id=ctx.node_id,
                                    data={"tool_name": tc["name"], "tool_input": tc["args"]},
                                ))
                                tool_calls_made.append({"name": tc["name"], "args": tc["args"]})

                            # Collect final text content
                            if msg.content and not msg.tool_calls:
                                final_response = str(msg.content)
                                if return_as == "assistant_message":
                                    # Stream token-by-token is not available in astream updates;
                                    # emit full content as single token then ASSISTANT_MESSAGE
                                    for char_chunk in _chunk_text(final_response):
                                        ctx.emit(ExecutionEvent(
                                            type=ExecutionEventType.TOKEN,
                                            node_id=ctx.node_id,
                                            data={"content": char_chunk},
                                        ))

                        elif isinstance(msg, ToolMessage):
                            # Emit tool_result event
                            tool_name = next(
                                (tc["name"] for tc in tool_calls_made if tc.get("id") == msg.tool_call_id),
                                msg.name or "unknown",
                            )
                            error = None if msg.status != "error" else msg.content
                            result_content = None if msg.status == "error" else msg.content
                            ctx.emit(ExecutionEvent(
                                type=ExecutionEventType.TOOL_RESULT,
                                node_id=ctx.node_id,
                                data={"tool_name": tool_name, "result": result_content, "error": error},
                            ))

        except Exception as exc:
            raise NodeExecutionError(f"AgentNode execution failed: {exc}") from exc

        if return_as == "assistant_message":
            ctx.halt()

        return {"response": final_response, "tool_calls": tool_calls_made}


def _chunk_text(text: str, size: int = 10) -> list[str]:
    """Split text into fixed-size chunks for token streaming simulation."""
    return [text[i:i + size] for i in range(0, len(text), size)] if text else []
