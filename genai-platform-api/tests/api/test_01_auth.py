"""Auth Module API Tests — /api/v1/auth"""
import base64, json as _json
from test_config import state, auth_headers, run_test, BASE_URL

def _extract_tenant_from_jwt(token: str):
    """Decode JWT payload to extract tenantId (no verification)."""
    try:
        payload = token.split(".")[1]
        payload += "=" * (4 - len(payload) % 4)  # pad base64
        data = _json.loads(base64.urlsafe_b64decode(payload))
        return data.get("tenantId", "")
    except Exception:
        return ""

def run():
    print("\n=== 1. AUTH MODULE ===")

    # TC-AUTH-01: Register (Happy Path)
    # On re-runs, user may already exist (409). Both are acceptable.
    ok, body, resp = run_test(
        "TC-AUTH-01", "Register new user", "POST", "/api/v1/auth/register", [201, 409],
        json_data={"email": "test@example.com", "password": "SecurePass123!", "fullName": "Test User"},
        headers={"Content-Type": "application/json"},
    )
    if ok and body:
        d = body.get("data", body)
        if d.get("accessToken"):
            state.access_token = d["accessToken"]
            state.refresh_token = d.get("refreshToken", "")
            state.tenant_id = _extract_tenant_from_jwt(state.access_token)
        if d.get("user"):
            state.user_id = d["user"].get("id", "")
        if d.get("tenant"):
            state.tenant_id = d["tenant"].get("id", state.tenant_id)

    # TC-AUTH-02: Register (Weak Password)
    run_test(
        "TC-AUTH-02", "Register with weak password", "POST", "/api/v1/auth/register", 400,
        json_data={"email": "test2@example.com", "password": "weak"},
        headers={"Content-Type": "application/json"}
    )

    # TC-AUTH-03: Register (Duplicate Email)
    run_test(
        "TC-AUTH-03", "Register duplicate email", "POST", "/api/v1/auth/register", 409,
        json_data={"email": "test@example.com", "password": "SecurePass123!!"},
        headers={"Content-Type": "application/json"}
    )

    # TC-AUTH-04: Login (Happy Path)
    ok, body, _ = run_test(
        "TC-AUTH-04", "Login with valid credentials", "POST", "/api/v1/auth/login", 201,
        json_data={"email": "test@example.com", "password": "SecurePass123!"},
        headers={"Content-Type": "application/json"},
        check_fn=lambda b, r: _assert(
            b.get("data", b).get("accessToken") or b.get("accessToken"), "Missing accessToken"
        )
    )
    if ok:
        d = body.get("data", body)
        state.access_token = d.get("accessToken", "")
        state.refresh_token = d.get("refreshToken", "")
        if d.get("user"):
            state.user_id = d["user"].get("id", "")
            state.tenant_id = d["user"].get("tenantId", state.tenant_id)
        # Fallback: extract tenantId from JWT if not in user object
        if not state.tenant_id and state.access_token:
            state.tenant_id = _extract_tenant_from_jwt(state.access_token)

    # TC-AUTH-05: Login (Wrong Password)
    run_test(
        "TC-AUTH-05", "Login wrong password", "POST", "/api/v1/auth/login", 401,
        json_data={"email": "test@example.com", "password": "WrongPass123!"},
        headers={"Content-Type": "application/json"}
    )

    # TC-AUTH-06: Refresh Token
    if state.refresh_token:
        ok, body, _ = run_test(
            "TC-AUTH-06", "Refresh token", "POST", "/api/v1/auth/refresh", 201,
            json_data={"refreshToken": state.refresh_token},
            headers={"Content-Type": "application/json"},
            check_fn=lambda b, r: _assert(
                b.get("data", b).get("accessToken") or b.get("accessToken"), "Missing new accessToken"
            )
        )
        if ok:
            d = body.get("data", body)
            state.access_token = d.get("accessToken", state.access_token)
            state.refresh_token = d.get("refreshToken", state.refresh_token)
    else:
        print("  [!] TC-AUTH-06: SKIP — no refresh token available")

    # TC-AUTH-07: Logout
    ok, _, _ = run_test(
        "TC-AUTH-07", "Logout", "POST", "/api/v1/auth/logout", 201,
        json_data={"refreshToken": state.refresh_token},
        headers=auth_headers()
    )

    # Re-login to get fresh tokens for remaining tests
    ok, body, _ = run_test(
        "TC-AUTH-04b", "Re-login after logout", "POST", "/api/v1/auth/login", 201,
        json_data={"email": "test@example.com", "password": "SecurePass123!"},
        headers={"Content-Type": "application/json"}
    )
    if ok:
        d = body.get("data", body)
        state.access_token = d.get("accessToken", "")
        state.refresh_token = d.get("refreshToken", "")
        # Ensure tenantId is set from JWT
        if not state.tenant_id and state.access_token:
            state.tenant_id = _extract_tenant_from_jwt(state.access_token)

    # TC-AUTH-08: Forgot Password
    run_test(
        "TC-AUTH-08", "Forgot password", "POST", "/api/v1/auth/forgot-password", 201,
        json_data={"email": "test@example.com"},
        headers={"Content-Type": "application/json"}
    )

    # TC-AUTH-09: Reset Password (Stub)
    run_test(
        "TC-AUTH-09", "Reset password stub", "POST", "/api/v1/auth/reset-password", 400,
        json_data={"token": "fake-token", "newPassword": "NewPass123!"},
        headers={"Content-Type": "application/json"}
    )

    # TC-AUTH-10: Verify Email (Stub)
    run_test(
        "TC-AUTH-10", "Verify email stub", "POST", "/api/v1/auth/verify-email", 400,
        json_data={"token": "fake-token"},
        headers={"Content-Type": "application/json"}
    )

    # TC-AUTH-11: Google OAuth (Stub)
    run_test(
        "TC-AUTH-11", "Google OAuth stub", "POST", "/api/v1/auth/oauth/google", 400,
        json_data={"idToken": "fake-google-token"},
        headers={"Content-Type": "application/json"}
    )

def _assert(condition, msg=""):
    if not condition:
        raise AssertionError(msg)

if __name__ == "__main__":
    run()
