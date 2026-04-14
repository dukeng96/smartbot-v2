# Phase 04.5 — Custom Tool/Function Security (RestrictedPython Sandbox)

**Status:** ⬜ pending

## Goal
Harden the two user-code nodes (`custom_tool`, `custom_function`) with a RestrictedPython sandbox: import whitelist, CPU/memory/time limits, and a security test suite proving escape attempts are blocked. Ship engine endpoints consumed by Phase 05 (NestJS CustomTool CRUD).

## Files to create

```
genai-engine/app/sandbox/
  __init__.py
  restricted.py            # compile + exec wrappers
  guards.py                # allowed builtins, safe __import__, write guards
  limits.py                # timeout (SIGALRM / thread-based), memory cap (resource.setrlimit)
  audit.py                 # execution audit log (who/when/duration/input hash)

genai-engine/app/api/v1/sandbox.py   # /compile-check + /execute-tool routes

genai-engine/tests/sandbox/
  test_whitelist.py        # allowed imports work
  test_escapes.py          # __import__, eval, open, subprocess, ctypes, file I/O → blocked
  test_limits.py           # infinite loop, memory bomb, deep recursion → killed
  test_compile_errors.py   # syntax errors, disallowed AST nodes → structured errors
  test_audit.py            # audit row emitted per execute
```

## Sandbox architecture

```
┌─────────────────────────────────────────────────────────┐
│  User code (CustomTool.implementation / CustomFunction) │
└──────────────┬──────────────────────────────────────────┘
               │ str
               ▼
  ┌────────────────────────┐
  │ RestrictedPython       │  AST transform: blocks attribute access on dunders,
  │ compile_restricted()   │  wraps writes via _write_, wraps iter via _getiter_
  └──────────┬─────────────┘
             │ code object
             ▼
  ┌────────────────────────┐
  │ sandbox.exec_in_sandbox │  exec(code, safe_globals, local_ns)
  │                        │  Guards: safe_builtins + safe __import__
  │                        │  Limits: SIGALRM / thread-kill + setrlimit(AS)
  └──────────┬─────────────┘
             │ returns local_ns['main'](args) or local_ns result
             ▼
       Caller (HttpNode / CustomTool exec / CustomFunction exec)
```

## Dependencies

```
RestrictedPython==7.4
```

Pin exact version — RestrictedPython API has broken between majors.

## Import whitelist

```python
# genai-engine/app/sandbox/guards.py
from RestrictedPython import safe_builtins, safe_globals, limited_builtins
from RestrictedPython.Guards import guarded_iter_unpack_sequence, guarded_unpack_sequence

ALLOWED_MODULES = frozenset({
    "math", "re", "json", "datetime", "string", "decimal", "fractions",
    "statistics", "itertools", "functools", "collections", "base64",
    "hashlib", "hmac", "uuid", "urllib.parse", "html",
})

def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    root = name.split(".")[0]
    if name not in ALLOWED_MODULES and root not in ALLOWED_MODULES:
        raise ImportError(f"Import '{name}' not allowed in sandbox")
    return __import__(name, globals, locals, fromlist, level)

SAFE_GLOBALS = {
    **safe_globals,
    "__builtins__": {
        **safe_builtins,
        **limited_builtins,
        "__import__": safe_import,
        "_getattr_": getattr,            # RestrictedPython hook
        "_getiter_": iter,
        "_getitem_": lambda o, k: o[k],
        "_write_": lambda x: x,          # allow writes to user-created objects
        "_unpack_sequence_": guarded_unpack_sequence,
        "_iter_unpack_sequence_": guarded_iter_unpack_sequence,
        "dict": dict, "list": list, "set": set, "tuple": tuple,
        "len": len, "range": range, "enumerate": enumerate, "zip": zip,
        "min": min, "max": max, "sum": sum, "sorted": sorted, "reversed": reversed,
        "str": str, "int": int, "float": float, "bool": bool, "bytes": bytes,
        "isinstance": isinstance, "print": lambda *a, **kw: None,  # silent print
    },
}
```

**Explicitly blocked:** `os`, `sys`, `subprocess`, `socket`, `ctypes`, `importlib`, `pickle`, `marshal`, `pathlib`, `shutil`, `tempfile`, `threading`, `multiprocessing`, `asyncio`, `ast`, `inspect`, `gc`, `builtins` direct access.

## Resource limits

```python
# genai-engine/app/sandbox/limits.py
import signal, resource, platform, threading
from contextlib import contextmanager

DEFAULT_TIMEOUT_S = 5
DEFAULT_MEMORY_MB = 128

class SandboxTimeoutError(Exception): pass
class SandboxMemoryError(Exception): pass

@contextmanager
def timeout(seconds: int = DEFAULT_TIMEOUT_S):
    """Linux/macOS: SIGALRM. Windows: thread-based kill flag."""
    if platform.system() == "Windows":
        # Windows: run in thread, set stop flag; code checks `_sandbox_deadline`
        # via Python's sys.settrace hook — simpler: enforce timeout at orchestrator
        # via asyncio.wait_for wrapping executor.submit(exec_in_sandbox)
        yield
        return
    def handler(signum, frame):
        raise SandboxTimeoutError(f"Execution exceeded {seconds}s")
    old = signal.signal(signal.SIGALRM, handler)
    signal.alarm(seconds)
    try:
        yield
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old)

def apply_memory_limit(mb: int = DEFAULT_MEMORY_MB):
    """Linux only. macOS partial. Windows: no-op (rely on orchestrator OOM guard)."""
    if platform.system() == "Linux":
        bytes_ = mb * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_AS, (bytes_, bytes_))
```

**Windows note:** engine target is Linux containers in prod; dev machines may be Windows. On Windows, timeout falls back to `asyncio.wait_for(loop.run_in_executor(...))` wrapping the exec call. Document explicitly — Windows dev = relaxed limits, Linux prod = hard limits.

## Exec wrapper

```python
# genai-engine/app/sandbox/restricted.py
from RestrictedPython import compile_restricted
from .guards import SAFE_GLOBALS
from .limits import timeout, apply_memory_limit

def compile_check(code: str) -> tuple[bool, list[str]]:
    """Return (compilable, errors). Used by NestJS create validation."""
    try:
        compile_restricted(code, filename="<user>", mode="exec")
        return True, []
    except SyntaxError as e:
        return False, [f"{e.__class__.__name__}: {e.msg} (line {e.lineno})"]
    except Exception as e:
        return False, [f"{e.__class__.__name__}: {e}"]

def exec_tool(code: str, entry: str, args: dict, timeout_s: int = 5) -> dict:
    """
    Compile + exec user code. Expect a top-level `def {entry}(args): ...` function.
    Returns {'output': ..., 'duration_ms': int, 'error': str | None}.
    """
    import time
    t0 = time.monotonic()
    try:
        byte_code = compile_restricted(code, filename="<user>", mode="exec")
    except Exception as e:
        return {"output": None, "duration_ms": 0, "error": f"compile: {e}"}

    local_ns = {}
    try:
        apply_memory_limit(128)
        with timeout(timeout_s):
            exec(byte_code, SAFE_GLOBALS, local_ns)
            if entry not in local_ns or not callable(local_ns[entry]):
                raise NameError(f"Missing function `{entry}(args)`")
            output = local_ns[entry](args)
        return {"output": output, "duration_ms": int((time.monotonic() - t0) * 1000), "error": None}
    except Exception as e:
        return {"output": None, "duration_ms": int((time.monotonic() - t0) * 1000),
                "error": f"{e.__class__.__name__}: {e}"}
```

Custom Tool entry: `def run(args): ...` (args = JSON-schema-validated dict).
Custom Function entry: `def main(state): ...` (state = flow state dict).

## Engine endpoints

```python
# genai-engine/app/api/v1/sandbox.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.sandbox.restricted import compile_check, exec_tool
from app.auth.internal import require_internal_key
from app.sandbox.audit import audit_execute

router = APIRouter(prefix="/v1/sandbox", dependencies=[Depends(require_internal_key)])

class CompileCheckReq(BaseModel):
    code: str = Field(..., max_length=20_000)

class CompileCheckResp(BaseModel):
    compilable: bool
    errors: list[str]

@router.post("/compile-check", response_model=CompileCheckResp)
async def compile_check_endpoint(req: CompileCheckReq):
    ok, errs = compile_check(req.code)
    return CompileCheckResp(compilable=ok, errors=errs)

class ExecuteToolReq(BaseModel):
    schema: dict
    implementation: str = Field(..., max_length=20_000)
    input: dict
    timeout_s: int = Field(5, ge=1, le=30)
    tenant_id: str | None = None    # optional, for audit
    tool_id: str | None = None

@router.post("/execute-tool")
async def execute_tool_endpoint(req: ExecuteToolReq):
    # 1. Validate input against schema (jsonschema)
    from jsonschema import validate, ValidationError
    try:
        validate(req.input, req.schema)
    except ValidationError as e:
        raise HTTPException(400, f"Input schema validation failed: {e.message}")
    # 2. Exec
    result = exec_tool(req.implementation, entry="run", args=req.input, timeout_s=req.timeout_s)
    # 3. Audit
    await audit_execute(
        tenant_id=req.tenant_id, tool_id=req.tool_id,
        duration_ms=result["duration_ms"], error=result["error"], input=req.input,
    )
    return result
```

Both routes gated by `X-Internal-Key` (set-per-deploy shared secret). Not exposed publicly.

## Audit log

```python
# genai-engine/app/sandbox/audit.py
import hashlib, json
from app.db import get_pool

async def audit_execute(*, tenant_id, tool_id, duration_ms, error, input):
    input_hash = hashlib.sha256(json.dumps(input, sort_keys=True).encode()).hexdigest()[:16]
    async with get_pool().acquire() as conn:
        await conn.execute(
            """INSERT INTO sandbox_audit (tenant_id, tool_id, duration_ms, error, input_hash, ts)
               VALUES ($1, $2, $3, $4, $5, NOW())""",
            tenant_id, tool_id, duration_ms, error, input_hash,
        )
```

**Schema add (Phase 01 amendment):**
```prisma
model SandboxAudit {
  id         String   @id @default(uuid()) @db.Uuid
  tenantId   String?  @map("tenant_id") @db.Uuid
  toolId     String?  @map("tool_id") @db.Uuid
  durationMs Int      @map("duration_ms")
  error      String?  @db.Text
  inputHash  String   @map("input_hash") @db.VarChar(32)
  ts         DateTime @default(now())
  @@index([tenantId, ts])
  @@map("sandbox_audit")
}
```

Retention: 30 days (cron purge). No raw input — hash only for privacy.

## Security test suite

```python
# genai-engine/tests/sandbox/test_escapes.py
import pytest
from app.sandbox.restricted import exec_tool

ESCAPES = [
    ("import os escape",           "def run(a):\n    import os\n    return os.listdir('/')"),
    ("__import__ escape",          "def run(a):\n    __import__('os').system('whoami')"),
    ("eval escape",                "def run(a):\n    return eval('1+1')"),
    ("exec escape",                "def run(a):\n    exec('x=1')"),
    ("open file",                  "def run(a):\n    return open('/etc/passwd').read()"),
    ("subprocess",                 "def run(a):\n    import subprocess\n    subprocess.run(['ls'])"),
    ("ctypes",                     "def run(a):\n    import ctypes"),
    ("dunder class escape",        "def run(a):\n    return ().__class__.__base__.__subclasses__()"),
    ("globals access",             "def run(a):\n    return globals()"),
    ("getattr dunder",             "def run(a):\n    return getattr(a, '__class__')"),
    ("importlib",                  "def run(a):\n    import importlib\n    importlib.import_module('os')"),
    ("pickle rce",                 "def run(a):\n    import pickle"),
    ("socket",                     "def run(a):\n    import socket"),
]

@pytest.mark.parametrize("label,code", ESCAPES, ids=[e[0] for e in ESCAPES])
def test_escape_blocked(label, code):
    result = exec_tool(code, entry="run", args={})
    assert result["error"] is not None, f"{label} should have been blocked"
    assert result["output"] is None


# test_limits.py
def test_infinite_loop_killed():
    code = "def run(a):\n    while True:\n        pass"
    result = exec_tool(code, entry="run", args={}, timeout_s=2)
    assert result["error"] and "exceed" in result["error"].lower()
    assert result["duration_ms"] < 3000   # killed near deadline

def test_memory_bomb_killed():
    code = "def run(a):\n    x = [0] * (10**9)\n    return len(x)"
    result = exec_tool(code, entry="run", args={}, timeout_s=5)
    assert result["error"] is not None   # MemoryError or killed

def test_deep_recursion():
    code = "def run(a):\n    def f(n): return f(n+1)\n    return f(0)"
    result = exec_tool(code, entry="run", args={})
    assert result["error"] and "recursion" in result["error"].lower()


# test_whitelist.py
def test_allowed_imports():
    code = """
import math, json, datetime, re
def run(a):
    return {"pi": math.pi, "now_year": datetime.datetime(2024,1,1).year, "json": json.dumps({"k":1})}
"""
    result = exec_tool(code, entry="run", args={})
    assert result["error"] is None
    assert result["output"]["pi"] == pytest.approx(3.14159, rel=1e-4)

def test_happy_path_tool():
    code = """
def run(args):
    return {"sum": args["a"] + args["b"]}
"""
    result = exec_tool(code, entry="run", args={"a": 2, "b": 3})
    assert result["output"] == {"sum": 5}
    assert result["error"] is None
```

Run with `pytest tests/sandbox/ -v`. **Block release if any escape test passes user code.**

## Monaco CSP / self-hosting

Custom Tool drawer (Phase 06) uses Monaco editor for `implementation` + `schema`. Monaco requires web workers + `eval`-equivalent dynamic code.

**CSP requirements:**
- `worker-src 'self' blob:` — Monaco spawns workers via `Blob` URLs
- `script-src 'self' 'unsafe-eval'` — Monaco uses `new Function` for tokenizer
  - **OR** use Monaco's AMD build + explicit worker paths to avoid `unsafe-eval` (documented as known complexity)
- `style-src 'self' 'unsafe-inline'` — Monaco injects inline styles

**Self-host:** vendor Monaco to `genai-platform-ui/public/monaco-editor/vs/` (copy from `node_modules/monaco-editor/min/vs/`). Configure `MonacoEnvironment.getWorkerUrl` to return paths under `/monaco-editor/vs/base/worker/`. No CDN fetch — offline-capable + CSP-clean.

Build step (Phase 06 amendment):
```json
// genai-platform-ui/package.json
"scripts": {
  "predev": "cp -r node_modules/monaco-editor/min/vs public/monaco-editor/",
  "prebuild": "cp -r node_modules/monaco-editor/min/vs public/monaco-editor/"
}
```

## Cap enforcement cross-ref

Phase 05 CustomToolsService enforces `CUSTOM_TOOL_CAP_PER_TENANT = 50` at create. Engine does not re-check cap (NestJS is authoritative). Engine's only job: compile-check + exec + audit.

## Success criteria

- [ ] `pip install RestrictedPython==7.4` + import works on Python 3.11+
- [ ] All 13 escape tests in `test_escapes.py` → `error != None` and `output == None`
- [ ] All 3 limit tests in `test_limits.py` → killed near deadline (< 2x timeout)
- [ ] All allowed imports work in `test_whitelist.py` (math, json, datetime, re, etc.)
- [ ] `POST /v1/sandbox/compile-check` returns structured errors for syntax failures
- [ ] `POST /v1/sandbox/execute-tool` runs happy-path tool + returns `{output, duration_ms, error: null}`
- [ ] Invalid input against schema → 400 with validation error message
- [ ] Audit row written per execute (tenant_id, tool_id, duration, error, input_hash)
- [ ] Missing `X-Internal-Key` → 401
- [ ] Windows dev: timeout via asyncio wrapper works (relaxed, documented)
- [ ] Linux prod container: SIGALRM + RLIMIT_AS enforce hard limits
- [ ] Monaco CSP: `worker-src 'self' blob:` + workers load from `/monaco-editor/vs/` (no CDN)
- [ ] Security test suite runs in CI — any escape passing = build fail

## Risks

- **RestrictedPython false negatives** — history of bypass CVEs (e.g., dunder `__class__` walks to subclasses). Mitigation: keep library pinned + updated, run escape suite in CI, review advisories quarterly. Consider adding `seccomp-bpf` container profile in prod as defense-in-depth (out of scope MVP).
- **Windows timeout gap** — SIGALRM not available. Thread-kill in Python is unsafe (`ctypes.pythonapi.PyThreadState_SetAsyncExc`) — we intentionally DO NOT use it. Windows dev = soft timeout via asyncio wrapper that returns `SandboxTimeoutError` but thread may keep running in background. Acceptable for dev; prod runs Linux containers where SIGALRM works.
- **Memory limit on macOS** — `RLIMIT_AS` partially supported. Acceptable (dev only).
- **RestrictedPython + async** — `exec_tool` is sync. Engine wraps in `loop.run_in_executor(None, exec_tool, ...)` at caller. Document requirement.
- **Monaco `unsafe-eval`** — if CSP forbids, Monaco still works via AMD build but slower load. Decision: accept `unsafe-eval` scoped to `/monaco-editor/*` via separate CSP policy for that route, OR load Monaco from iframe sandbox. Defer decision to Phase 06 UI review.
- **Audit table growth** — 30d retention + cron purge. If high volume, add daily partition.
- **Input hash collision** — sha256 truncated to 16 chars = 64-bit. Adequate for audit lookup, not security.

## Dependencies

- Phase 01 (Prisma) — add `SandboxAudit` model (amendment)
- Phase 03 (engine scaffold) — `/v1/sandbox/*` routes registered
- Phase 05 (NestJS CustomTool CRUD) — consumer of `/compile-check` + `/execute-tool`
- Phase 06 (Canvas UI) — Monaco editor host + CSP
- Phase 10 `webhook-with-approval` template — uses Custom Function, blocks release until sandbox proven

## Out of scope

- Per-tool rate limiting (phase 2 — rely on overall quota guard)
- gVisor / Firecracker container-level isolation (phase 2 if compliance needs it)
- User-uploaded Python packages (explicitly refused — whitelist only)
- JavaScript custom functions (Flowise parity not a goal — RestrictedPython only)
- Streaming exec output (sync exec, return once)

## Unresolved questions

1. **Monaco CSP `unsafe-eval` scope** — route-scoped policy or iframe sandbox? Defer to Phase 06.
2. **Audit retention** — 30d sufficient, or 90d for compliance trail? Check with security lead.
3. **Seccomp profile** — adopt for engine container in prod? Adds complexity; defer unless SOC2 demands.
4. **VNPT rate limit on compile-check** — NestJS hits engine per-create. If user spams invalid code, engine CPU burn. Add per-tenant rate limit at NestJS layer (e.g., 20 compile-checks/min).
