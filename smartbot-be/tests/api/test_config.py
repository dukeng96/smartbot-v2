"""Shared configuration and helpers for API route tests."""
import requests
import json
import sys
import time
from dataclasses import dataclass, field
from typing import Optional, Union, List

BASE_URL = "http://localhost:3000"
INTERNAL_KEY = "internal-secret-key-for-dev"

# Shared state across test modules
@dataclass
class TestState:
    access_token: str = ""
    refresh_token: str = ""
    user_id: str = ""
    tenant_id: str = ""
    bot_id: str = ""
    draft_bot_id: str = ""
    kb_id: str = ""
    doc_id: str = ""
    doc_text_id: str = ""
    doc_url_id: str = ""
    conv_id: str = ""
    channel_id: str = ""
    member_user_id: str = ""
    plan_starter_id: str = ""

state = TestState()

# Test tracking
results = []

def auth_headers(token: Optional[str] = None) -> dict:
    t = token or state.access_token
    return {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}

def internal_headers() -> dict:
    return {"X-Internal-Key": INTERNAL_KEY, "Content-Type": "application/json"}

def run_test(test_id: str, description: str, method: str, path: str,
             expected_status: Union[int, List[int]], json_data: dict = None, headers: dict = None,
             files=None, params: dict = None, check_fn=None) -> bool:
    """Execute a single API test and record result."""
    url = f"{BASE_URL}{path}"
    h = headers or {}
    try:
        if files:
            # For file uploads, don't set Content-Type (requests handles it)
            auth_h = {"Authorization": f"Bearer {state.access_token}"}
            resp = requests.request(method, url, files=files, headers=auth_h, timeout=15)
        else:
            resp = requests.request(method, url, json=json_data, headers=h, params=params, timeout=15)

        if isinstance(expected_status, (list, tuple)):
            status_ok = resp.status_code in expected_status
        else:
            status_ok = resp.status_code == expected_status
        body = None
        try:
            body = resp.json()
        except Exception:
            body = resp.text

        extra_ok = True
        extra_msg = ""
        if check_fn and status_ok:
            try:
                check_fn(body, resp)
            except AssertionError as e:
                extra_ok = False
                extra_msg = f" | Check failed: {e}"
            except Exception as e:
                extra_ok = False
                extra_msg = f" | Check error: {e}"

        passed = status_ok and extra_ok
        status_str = "PASS" if passed else "FAIL"
        detail = f"Expected {expected_status}, got {resp.status_code}{extra_msg}"

        results.append({"id": test_id, "desc": description, "passed": passed, "detail": detail})

        icon = "+" if passed else "!"
        print(f"  [{icon}] {test_id}: {description} — {detail}")
        return passed, body, resp
    except requests.exceptions.ConnectionError:
        results.append({"id": test_id, "desc": description, "passed": False, "detail": "Connection refused"})
        print(f"  [!] {test_id}: {description} — Connection refused")
        return False, None, None
    except Exception as e:
        results.append({"id": test_id, "desc": description, "passed": False, "detail": str(e)})
        print(f"  [!] {test_id}: {description} — Error: {e}")
        return False, None, None

def print_summary():
    """Print final test summary."""
    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    failed = total - passed

    print("\n" + "=" * 70)
    print(f"  RESULTS: {passed}/{total} passed, {failed} failed")
    print("=" * 70)

    if failed > 0:
        print("\nFailed tests:")
        for r in results:
            if not r["passed"]:
                print(f"  [!] {r['id']}: {r['desc']} — {r['detail']}")

    return passed, failed
