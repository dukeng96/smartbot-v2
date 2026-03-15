"""Tenants Module API Tests — /api/v1/tenants"""
from test_config import state, auth_headers, run_test

def run():
    print("\n=== 3. TENANTS MODULE ===")

    if not state.tenant_id:
        print("  [!] SKIP — no tenant_id available")
        return

    tid = state.tenant_id

    # TC-TENANT-01: Get Tenant
    run_test(
        "TC-TENANT-01", "Get tenant", "GET", f"/api/v1/tenants/{tid}", 200,
        headers=auth_headers(),
        check_fn=lambda b, r: _assert(
            (b.get("data", b).get("id") or b.get("id")) == tid,
            "Wrong tenant id"
        )
    )

    # TC-TENANT-02: Update Tenant
    run_test(
        "TC-TENANT-02", "Update tenant", "PATCH", f"/api/v1/tenants/{tid}", 200,
        json_data={"name": "My Updated Workspace"},
        headers=auth_headers()
    )

    # TC-TENANT-03: List Members
    run_test(
        "TC-TENANT-03", "List members", "GET", f"/api/v1/tenants/{tid}/members", 200,
        headers=auth_headers(),
        check_fn=lambda b, r: _assert(
            isinstance(b.get("data", b), list) or isinstance(b, list),
            "Expected array of members"
        )
    )

    # TC-TENANT-04: Invite Member
    ok, body, _ = run_test(
        "TC-TENANT-04", "Invite member", "POST", f"/api/v1/tenants/{tid}/members", 201,
        json_data={"email": "member@example.com", "role": "member"},
        headers=auth_headers()
    )
    if ok and body:
        d = body.get("data", body)
        if isinstance(d, dict) and d.get("userId"):
            state.member_user_id = d["userId"]
        elif isinstance(d, dict) and d.get("user", {}).get("id"):
            state.member_user_id = d["user"]["id"]

    # TC-TENANT-05: Update Member Role (Owner Only)
    if state.member_user_id:
        run_test(
            "TC-TENANT-05", "Update member role", "PATCH",
            f"/api/v1/tenants/{tid}/members/{state.member_user_id}", 200,
            json_data={"role": "admin"},
            headers=auth_headers()
        )

    # TC-TENANT-06: Remove Member
    if state.member_user_id:
        run_test(
            "TC-TENANT-06", "Remove member", "DELETE",
            f"/api/v1/tenants/{tid}/members/{state.member_user_id}", 200,
            headers=auth_headers()
        )

def _assert(condition, msg=""):
    if not condition:
        raise AssertionError(msg)

if __name__ == "__main__":
    run()
