"""Users Module API Tests — /api/v1/users"""
from test_config import state, auth_headers, run_test

def run():
    print("\n=== 2. USERS MODULE ===")

    # TC-USER-01: Get Profile
    run_test(
        "TC-USER-01", "Get profile", "GET", "/api/v1/users/me", 200,
        headers=auth_headers(),
        check_fn=lambda b, r: _assert(
            (b.get("data", b).get("email") or b.get("email")) == "test@example.com",
            f"Wrong email in profile"
        )
    )

    # TC-USER-02: Update Profile
    run_test(
        "TC-USER-02", "Update profile", "PATCH", "/api/v1/users/me", 200,
        json_data={"fullName": "Updated Name", "phone": "0912345678"},
        headers=auth_headers(),
        check_fn=lambda b, r: _assert(
            (b.get("data", b).get("fullName") or b.get("fullName")) == "Updated Name",
            "Name not updated"
        )
    )

    # TC-USER-03: Unauthenticated Access
    run_test(
        "TC-USER-03", "Unauthenticated access", "GET", "/api/v1/users/me", 401,
        headers={"Content-Type": "application/json"}
    )

def _assert(condition, msg=""):
    if not condition:
        raise AssertionError(msg)

if __name__ == "__main__":
    run()
