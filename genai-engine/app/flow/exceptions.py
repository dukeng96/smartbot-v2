"""Flow subsystem exceptions."""


class FlowValidationError(Exception):
    """Raised when a flow definition fails structural validation."""


class NodeExecutionError(Exception):
    """Raised when a node fails during execution."""
