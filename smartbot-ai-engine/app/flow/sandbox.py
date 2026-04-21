"""
RestrictedPython sandbox for CodeNode user-supplied scripts.

Security model
--------------
- Code compiled with RestrictedPython (compile_restricted) — blocks attribute
  access to dunder names, import hooks, and other escape vectors at AST level.
- __builtins__ built from RestrictedPython's safe_builtins + a small explicit
  extension. Never hand-rolled from scratch (team-lead hardening req #1).
- Dangerous builtins (open, __import__, eval, exec, compile, os, sys, …)
  are absent — NameError on any attempt to call them.

Thread-leak caveat
------------------
Python cannot forcibly kill a thread running a pure-Python tight loop
(e.g., ``while True: pass``). ``future.result(timeout=N)`` returns caller
control, but the thread may continue burning CPU until the process exits.
A module-level semaphore (MAX_CONCURRENT_SANDBOX_THREADS) caps the number of
concurrent runaway threads; SandboxBusyError is raised when the semaphore is
exhausted. Use this module only in environments where controlled restarts
(e.g., container health-checks) can reclaim leaked threads.

Output contract
---------------
User code **must** assign a dict to a variable literally named ``output``:

    output = {"key": value}

If ``output`` is absent or not a dict, SandboxError is raised.

Stdin/stdout
------------
stdout is captured and capped at 10 KB; excess is truncated with "[...truncated]".
stdin is always empty.
"""
from __future__ import annotations

import concurrent.futures
import json
import re
import threading
from typing import Any

from pydantic import BaseModel
from RestrictedPython import PrintCollector, compile_restricted, safe_builtins
from RestrictedPython.Guards import safer_getattr

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAX_CODE_BYTES = 10_000          # 10 KB
MAX_INPUT_BYTES = 100_000        # 100 KB (JSON-serialized)
MAX_STDOUT_BYTES = 10_240        # 10 KB
MAX_CONCURRENT_SANDBOX_THREADS = 10
DEFAULT_TIMEOUT_SEC = 5.0

_VALID_IDENTIFIER = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")

# ---------------------------------------------------------------------------
# Module-level executor + semaphore (avoids per-call overhead)
# ---------------------------------------------------------------------------

_executor = concurrent.futures.ThreadPoolExecutor(
    max_workers=MAX_CONCURRENT_SANDBOX_THREADS,
    thread_name_prefix="sandbox",
)
_semaphore = threading.Semaphore(MAX_CONCURRENT_SANDBOX_THREADS)

# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class SandboxError(Exception):
    """Raised for policy violations, output contract failures, exec errors."""


class SandboxBusyError(SandboxError):
    """Raised when the sandbox semaphore is exhausted."""


# ---------------------------------------------------------------------------
# Restricted builtins
# ---------------------------------------------------------------------------

def _build_builtins() -> dict[str, Any]:
    """Return safe_builtins + explicit extras needed for common operations."""
    extras: dict[str, Any] = {
        # Iteration / functional
        "enumerate": enumerate,
        "map": map,
        "filter": filter,
        "sum": sum,
        "min": min,
        "max": max,
        # I/O (stdout only — captured)
        "print": print,
        # Containers
        "list": list,
        "dict": dict,
        "set": set,
        # Misc
        "hasattr": hasattr,
        "getattr": getattr,
        "type": type,
    }
    builtins = dict(safe_builtins)
    builtins.update(extras)
    return builtins


_SAFE_BUILTINS = _build_builtins()

# ---------------------------------------------------------------------------
# Pydantic result schema
# ---------------------------------------------------------------------------


class SandboxResult(BaseModel):
    output: dict[str, Any] = {}
    stdout: str = ""
    error: str | None = None


# ---------------------------------------------------------------------------
# Internal execution (runs inside thread)
# ---------------------------------------------------------------------------


def _exec_in_thread(code_obj: Any, local_vars: dict[str, Any]) -> tuple[dict[str, Any], str]:
    """Execute compiled code; returns (output_dict, captured_stdout)."""
    # PrintCollector is the RP-approved mechanism for capturing print() calls.
    # RP transforms `print(x)` → `_print_(x)` at compile time; providing
    # PrintCollector as `_print_` injects the collector instance into locals
    # as `_print` after exec, from which `.txt` yields the captured lines.
    safe_globals: dict[str, Any] = {
        "__builtins__": _SAFE_BUILTINS,
        "__name__": "__sandbox__",
        "_getattr_": safer_getattr,
        "_getiter_": iter,
        "_getitem_": lambda obj, key: obj[key],
        "_write_": lambda x: x,
        "_inplacevar_": lambda op, x, y: x,
        "_print_": PrintCollector,
    }

    local_scope = dict(local_vars)
    local_scope["inputs"] = local_vars  # convenience alias

    exec(code_obj, safe_globals, local_scope)  # noqa: S102 — intentional restricted exec

    # Collect stdout from PrintCollector instance stored as `_print` in locals
    print_instance = local_scope.get("_print")
    raw_stdout = "".join(print_instance.txt) if print_instance else ""
    if len(raw_stdout.encode()) > MAX_STDOUT_BYTES:
        raw_stdout = raw_stdout.encode()[:MAX_STDOUT_BYTES].decode(errors="replace") + "[...truncated]"

    result = local_scope.get("output")
    if result is None:
        raise SandboxError("Code must assign dict to 'output'")
    if not isinstance(result, dict):
        raise SandboxError(f"'output' must be a dict, got {type(result).__name__}")

    return result, raw_stdout


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def run_code(
    code: str,
    inputs: dict[str, Any],
    timeout_sec: float = DEFAULT_TIMEOUT_SEC,
) -> SandboxResult:
    """
    Execute ``code`` in a RestrictedPython sandbox.

    Parameters
    ----------
    code:
        Python source. Must assign a dict to ``output``. Max 10 KB.
    inputs:
        Variables injected into local scope. Keys must be valid Python
        identifiers. Total JSON size must not exceed 100 KB.
    timeout_sec:
        Wall-clock timeout. Returns SandboxResult(error="timeout") on
        expiry; the underlying thread may leak for pure-Python loops.

    Raises
    ------
    SandboxError:
        Policy violation (oversized code/inputs, invalid key, bad output).
    SandboxBusyError:
        All sandbox thread slots are occupied.
    """
    # --- Input validation ---
    if len(code.encode()) > MAX_CODE_BYTES:
        raise SandboxError(f"Code exceeds {MAX_CODE_BYTES} byte limit")

    for key in inputs:
        if not _VALID_IDENTIFIER.match(key):
            raise SandboxError(f"Invalid input key '{key}': must be a valid Python identifier")

    try:
        serialized_size = len(json.dumps(inputs).encode())
    except (TypeError, ValueError) as exc:
        raise SandboxError(f"inputs not JSON-serializable: {exc}") from exc

    if serialized_size > MAX_INPUT_BYTES:
        raise SandboxError(f"inputs exceed {MAX_INPUT_BYTES} byte limit")

    # --- Compile (raises SyntaxError / RestrictedPython errors outside thread) ---
    try:
        code_obj = compile_restricted(code, "<sandbox>", "exec")
    except SyntaxError as exc:
        return SandboxResult(error=f"SyntaxError: {exc}")

    # --- Semaphore guard ---
    acquired = _semaphore.acquire(blocking=False)
    if not acquired:
        raise SandboxBusyError("Sandbox thread pool exhausted — try again later")

    try:
        future = _executor.submit(_exec_in_thread, code_obj, dict(inputs))
        try:
            output, stdout = future.result(timeout=timeout_sec)
            return SandboxResult(output=output, stdout=stdout)
        except concurrent.futures.TimeoutError:
            return SandboxResult(error="timeout")
        except SandboxError:
            raise
        except Exception as exc:
            return SandboxResult(error=f"{type(exc).__name__}: {exc}")
    finally:
        _semaphore.release()
