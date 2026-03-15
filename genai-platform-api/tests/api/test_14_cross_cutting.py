"""Cross-Cutting Test Scenarios"""
import requests
from test_config import state, BASE_URL, auth_headers, run_test, results

def run():
    print("\n=== 14. CROSS-CUTTING SCENARIOS ===")

    # ---- 6.1 Authentication & Authorization ----
    print("\n  -- Auth & Authorization --")

    # CC-01: Access protected route without token
    run_test("CC-01", "No token on protected route", "GET",
             "/api/v1/users/me", 401)

    # CC-02: Expired/invalid token
    run_test("CC-02", "Expired token", "GET",
             "/api/v1/users/me", 401,
             headers={"Authorization": "Bearer expired.invalid.token", "Content-Type": "application/json"})

    # CC-03: Malformed token
    run_test("CC-03", "Malformed token", "GET",
             "/api/v1/users/me", 401,
             headers={"Authorization": "Bearer not-a-jwt", "Content-Type": "application/json"})

    # CC-04: Access bot from different tenant (use a fake UUID)
    if state.access_token:
        run_test("CC-04", "Bot from different tenant", "GET",
                 "/api/v1/bots/00000000-0000-0000-0000-000000000000", 404,
                 headers=auth_headers())

    # CC-05: Non-owner tenant update (we only have owner, so skip or test with member)
    print("  [~] CC-05: SKIP — requires second user with member role")

    # ---- 6.2 Pagination ----
    print("\n  -- Pagination --")

    if state.access_token and state.bot_id:
        # CC-06: Limit param
        run_test("CC-06", "Pagination limit=5", "GET",
                 "/api/v1/bots", 200,
                 headers=auth_headers(),
                 params={"page": 1, "limit": 5})

        # CC-07: Page beyond data
        run_test("CC-07", "Page beyond data", "GET",
                 "/api/v1/bots", 200,
                 headers=auth_headers(),
                 params={"page": 999, "limit": 5})

        # CC-08: Sort param
        run_test("CC-08", "Sort by name asc", "GET",
                 "/api/v1/bots", 200,
                 headers=auth_headers(),
                 params={"sort": "name", "order": "asc"})

        # CC-09: Default pagination
        run_test("CC-09", "Default pagination", "GET",
                 "/api/v1/bots", 200,
                 headers=auth_headers())
    else:
        print("  [~] CC-06..09: SKIP — no auth/bot")

    # ---- 6.3 Quota Enforcement ----
    print("\n  -- Quota Enforcement --")

    # CC-10: Already tested in TC-BOT-02 (create bot quota)
    print("  [~] CC-10: Covered by TC-BOT-02 (bot quota)")

    # CC-11: Chat credits exhausted — hard to test without consuming all credits
    print("  [~] CC-11: SKIP — requires exhausted credits")

    # CC-12: Doc char limit — hard to test without filling knowledge
    print("  [~] CC-12: SKIP — requires full char limit")

    # ---- 6.4 Validation ----
    print("\n  -- Validation --")

    # CC-13: Invalid UUID in path
    if state.access_token:
        run_test("CC-13", "Invalid UUID in path", "GET",
                 "/api/v1/bots/not-a-uuid", 400,
                 headers=auth_headers())

    # CC-14: Missing required fields
    run_test("CC-14", "Missing required fields", "POST",
             "/api/v1/auth/register", 400,
             json_data={})

    # CC-15: Invalid email format
    run_test("CC-15", "Invalid email format", "POST",
             "/api/v1/auth/register", 400,
             json_data={"email": "not-an-email", "password": "SecurePass123!", "fullName": "Test"})

    # CC-16: Weak password
    run_test("CC-16", "Weak password", "POST",
             "/api/v1/auth/register", 400,
             json_data={"email": "weakpw@test.com", "password": "weak", "fullName": "Test"})

    # ---- 6.5 Soft Delete ----
    print("\n  -- Soft Delete --")

    if state.access_token:
        # CC-17: Deleted bot not in list — verified if we deleted a bot earlier
        ok, body, _ = run_test("CC-17", "Deleted bot filtered from list", "GET",
                               "/api/v1/bots", 200,
                               headers=auth_headers())
        if ok and body:
            data = body.get("data", [])
            if isinstance(data, list):
                deleted = [b for b in data if b.get("deletedAt") is not None]
                if deleted:
                    results[-1]["passed"] = False
                    results[-1]["detail"] += " | Found deleted bot in list!"
                    print("    [!] Found deleted bot in list!")

        # CC-18: Deleted KB not in list
        ok, body, _ = run_test("CC-18", "Deleted KB filtered from list", "GET",
                               "/api/v1/knowledge-bases", 200,
                               headers=auth_headers())
        if ok and body:
            data = body.get("data", [])
            if isinstance(data, list):
                deleted = [k for k in data if k.get("deletedAt") is not None]
                if deleted:
                    results[-1]["passed"] = False
                    results[-1]["detail"] += " | Found deleted KB in list!"

        # CC-19: Deleted doc not in list
        if state.kb_id:
            ok, body, _ = run_test("CC-19", "Deleted doc filtered from list", "GET",
                                   f"/api/v1/knowledge-bases/{state.kb_id}/documents", 200,
                                   headers=auth_headers())
            if ok and body:
                data = body.get("data", [])
                if isinstance(data, list):
                    deleted = [d for d in data if d.get("deletedAt") is not None]
                    if deleted:
                        results[-1]["passed"] = False
                        results[-1]["detail"] += " | Found deleted doc in list!"
        else:
            print("  [~] CC-19: SKIP — no kb_id")
    else:
        print("  [~] CC-17..19: SKIP — no auth")

if __name__ == "__main__":
    run()
