"""CodeNode — executes user-supplied Python via RestrictedPython sandbox."""
from typing import Any

from app.flow.base_node import BaseNode, NodeDefinition, NodeInput, NodeOutput
from app.flow.context import NodeExecutionContext
from app.flow.exceptions import NodeExecutionError
from app.flow.node_types import NodeCategory
from app.flow.registry import NodeRegistry
from app.flow.sandbox import SandboxError, run_code


@NodeRegistry.register
class CodeNode(BaseNode):
    definition = NodeDefinition(
        type="code",
        category=NodeCategory.UTILITY,
        label="Code",
        description=(
            "Runs user-supplied Python in a RestrictedPython sandbox. "
            "Code must assign a dict to 'output'. "
            "Flow state is available via the 'inputs' dict."
        ),
        icon="code",
        inputs=[
            NodeInput(name="code", type="string", required=True),
        ],
        outputs=[
            NodeOutput(name="output", type="object"),
            NodeOutput(name="stdout", type="string"),
        ],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict[str, Any]:
        code = ctx.inputs.get("code", "")
        sandbox_inputs = {k: v for k, v in ctx.state.items() if isinstance(k, str) and k.isidentifier()}

        try:
            result = run_code(code=code, inputs=sandbox_inputs)
        except SandboxError as exc:
            raise NodeExecutionError(f"CodeNode sandbox error: {exc}") from exc

        if result.error:
            raise NodeExecutionError(f"CodeNode execution error: {result.error}")

        return {"output": result.output, "stdout": result.stdout}
