"""Import all node modules to trigger NodeRegistry.register() calls."""
from app.flow.nodes import hello  # noqa: F401
from app.flow.nodes import start  # noqa: F401
from app.flow.nodes import end  # noqa: F401
from app.flow.nodes import sticky_note  # noqa: F401
from app.flow.nodes import set_variable  # noqa: F401
from app.flow.nodes import text_formatter  # noqa: F401
from app.flow.nodes import code  # noqa: F401
from app.flow.nodes import condition  # noqa: F401
from app.flow.nodes import memory  # noqa: F401
from app.flow.nodes import http_request  # noqa: F401
from app.flow.nodes import llm  # noqa: F401
from app.flow.nodes import knowledge_base  # noqa: F401
from app.flow.nodes import agent        # noqa: F401
from app.flow.nodes import custom_tool  # noqa: F401
from app.flow.nodes import human_input  # noqa: F401
