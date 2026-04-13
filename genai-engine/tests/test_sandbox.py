"""Unit tests for app/flow/sandbox.py — RestrictedPython sandbox."""
import threading
import time

import pytest

from app.flow.sandbox import (
    MAX_CODE_BYTES,
    MAX_CONCURRENT_SANDBOX_THREADS,
    SandboxBusyError,
    SandboxError,
    SandboxResult,
    run_code,
)


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


def test_happy_path() -> None:
    result = run_code(
        code="output = {'sum': sum(inputs['nums'])}",
        inputs={"nums": [1, 2, 3]},
    )
    assert result.error is None
    assert result.output == {"sum": 6}


def test_stdout_captured() -> None:
    result = run_code(
        code="print('hello'); output = {}",
        inputs={},
    )
    assert result.error is None
    assert "hello" in result.stdout


def test_inputs_accessible_as_variable() -> None:
    result = run_code(
        code="output = {'x': x * 2}",
        inputs={"x": 7},
    )
    assert result.output == {"x": 14}


def test_missing_output_raises() -> None:
    with pytest.raises(SandboxError, match="output"):
        run_code(code="x = 1", inputs={})


def test_output_not_dict_raises() -> None:
    with pytest.raises(SandboxError, match="dict"):
        run_code(code="output = [1, 2, 3]", inputs={})


# ---------------------------------------------------------------------------
# Security: blocked builtins
# ---------------------------------------------------------------------------


def test_blocks_import_os() -> None:
    result = run_code(code="__import__('os')", inputs={})
    assert result.error is not None


def test_blocks_open() -> None:
    result = run_code(code="open('/etc/passwd')", inputs={})
    assert result.error is not None


def test_blocks_eval() -> None:
    result = run_code(code="output = {'r': eval('1+1')}", inputs={})
    assert result.error is not None


def test_blocks_exec() -> None:
    result = run_code(code="exec('x=1')", inputs={})
    assert result.error is not None


def test_blocks_subprocess() -> None:
    result = run_code(code="__import__('subprocess')", inputs={})
    assert result.error is not None


def test_blocks_dunder_access() -> None:
    # RestrictedPython should block dunder attribute traversal
    result = run_code(code="output = {'r': ().__class__.__bases__}", inputs={})
    assert result.error is not None


# ---------------------------------------------------------------------------
# DoS / size limits
# ---------------------------------------------------------------------------


def test_rejects_oversized_code() -> None:
    big_code = "x = 1\n" * 5000  # well over 10 KB
    assert len(big_code.encode()) > MAX_CODE_BYTES
    with pytest.raises(SandboxError, match="byte limit"):
        run_code(code=big_code, inputs={})


def test_rejects_invalid_input_key() -> None:
    with pytest.raises(SandboxError, match="Invalid input key"):
        run_code(code="output = {}", inputs={"1bad": 1})


def test_rejects_invalid_input_key_space() -> None:
    with pytest.raises(SandboxError, match="Invalid input key"):
        run_code(code="output = {}", inputs={"bad key": 1})


# ---------------------------------------------------------------------------
# Timeout
# ---------------------------------------------------------------------------


def test_timeout_infinite_loop() -> None:
    start = time.monotonic()
    result = run_code(
        code="while True: pass",
        inputs={},
        timeout_sec=1.0,
    )
    elapsed = time.monotonic() - start
    # Caller must regain control within 2× timeout + overhead
    assert elapsed < 6.0, f"Timeout did not return in time: {elapsed:.1f}s"
    assert result.error == "timeout"


# ---------------------------------------------------------------------------
# Concurrency limit
# ---------------------------------------------------------------------------


def test_concurrency_limit() -> None:
    """When all semaphore slots are occupied, run_code raises SandboxBusyError."""
    from app.flow.sandbox import _semaphore

    # Manually exhaust all semaphore slots
    acquired_count = 0
    try:
        for _ in range(MAX_CONCURRENT_SANDBOX_THREADS):
            ok = _semaphore.acquire(blocking=False)
            if ok:
                acquired_count += 1

        assert acquired_count == MAX_CONCURRENT_SANDBOX_THREADS, (
            f"Could only acquire {acquired_count}/{MAX_CONCURRENT_SANDBOX_THREADS} slots"
        )

        # With semaphore full, the next call must raise SandboxBusyError
        with pytest.raises(SandboxBusyError):
            run_code(code="output = {}", inputs={})
    finally:
        for _ in range(acquired_count):
            _semaphore.release()
