"""ConditionNode — evaluates a boolean expression via sandbox, routes true/false."""
from typing import Any

from app.flow.base_node import BaseNode, NodeDefinition, NodeInput, NodeOutput
from app.flow.context import NodeExecutionContext
from app.flow.exceptions import NodeExecutionError
from app.flow.node_types import NodeCategory
from app.flow.registry import NodeRegistry
from app.flow.sandbox import SandboxError, run_code

_MAX_EXPR_LEN = 500


@NodeRegistry.register
class ConditionNode(BaseNode):
    definition = NodeDefinition(
        type="condition",
        category=NodeCategory.CONTROL,
        label="Condition",
        description=(
            "Evaluates a Python boolean expression against flow state. "
            "Expression max length: 500 chars. "
            "Routes to true_output or false_output based on result."
        ),
        icon="git-branch",
        inputs=[
            NodeInput(name="condition_expr", type="string", required=True),
            NodeInput(name="true_output", type="string", required=False, default="true"),
            NodeInput(name="false_output", type="string", required=False, default="false"),
        ],
        outputs=[
            NodeOutput(name="result", type="boolean"),
            NodeOutput(name="branch", type="string"),
        ],
    )

    async def execute(self, ctx: NodeExecutionContext) -> dict[str, Any]:
        expr = ctx.resolve(ctx.inputs.get("condition_expr", ""))

        if len(expr) > _MAX_EXPR_LEN:
            raise NodeExecutionError(
                f"condition_expr exceeds {_MAX_EXPR_LEN} char limit ({len(expr)} chars)"
            )

        sandbox_inputs = {
            k: v for k, v in ctx.state.items()
            if isinstance(k, str) and k.isidentifier()
        }

        eval_code = f"output = {{'result': bool({expr})}}"
        try:
            result = run_code(code=eval_code, inputs=sandbox_inputs)
        except SandboxError as exc:
            raise NodeExecutionError(f"ConditionNode sandbox error: {exc}") from exc

        if result.error:
            raise NodeExecutionError(f"ConditionNode evaluation error: {result.error}")

        bool_result = bool(result.output.get("result", False))
        true_out = ctx.resolve(ctx.inputs.get("true_output", "true"))
        false_out = ctx.resolve(ctx.inputs.get("false_output", "false"))
        branch = true_out if bool_result else false_out

        return {"result": bool_result, "branch": branch}
