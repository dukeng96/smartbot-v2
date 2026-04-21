"""Knowledge Bases Module API Tests — /api/v1/knowledge-bases"""
from test_config import state, auth_headers, run_test

def run():
    print("\n=== 5. KNOWLEDGE BASES MODULE ===")

    # TC-KB-01: Create Knowledge Base
    ok, body, _ = run_test(
        "TC-KB-01", "Create KB", "POST", "/api/v1/knowledge-bases", 201,
        json_data={"name": "Product FAQ", "description": "FAQ about our products",
                    "chunkSize": 500, "chunkOverlap": 50},
        headers=auth_headers()
    )
    if ok and body:
        d = body.get("data", body)
        state.kb_id = d.get("id", "")

    # TC-KB-02: List Knowledge Bases
    run_test(
        "TC-KB-02", "List KBs", "GET", "/api/v1/knowledge-bases", 200,
        headers=auth_headers(),
        params={"page": 1, "limit": 10}
    )

    if not state.kb_id:
        print("  [!] Remaining KB tests SKIP — no kb_id")
        return

    kid = state.kb_id

    # TC-KB-03: Get KB Detail
    run_test(
        "TC-KB-03", "Get KB detail", "GET", f"/api/v1/knowledge-bases/{kid}", 200,
        headers=auth_headers()
    )

    # TC-KB-04: Update KB
    run_test(
        "TC-KB-04", "Update KB", "PATCH", f"/api/v1/knowledge-bases/{kid}", 200,
        json_data={"name": "Updated FAQ", "description": "Updated description"},
        headers=auth_headers()
    )

    # Attach KB to bot (TC-BOT-16)
    if state.bot_id:
        ok, body, _ = run_test(
            "TC-BOT-16", "Attach KB to bot", "POST",
            f"/api/v1/bots/{state.bot_id}/knowledge-bases", 201,
            json_data={"knowledgeBaseId": kid, "priority": 1},
            headers=auth_headers()
        )

        # TC-BOT-17: Attach KB duplicate
        run_test(
            "TC-BOT-17", "Attach KB duplicate", "POST",
            f"/api/v1/bots/{state.bot_id}/knowledge-bases", 409,
            json_data={"knowledgeBaseId": kid, "priority": 1},
            headers=auth_headers()
        )

        # TC-BOT-18: List Attached KBs
        run_test(
            "TC-BOT-18", "List attached KBs", "GET",
            f"/api/v1/bots/{state.bot_id}/knowledge-bases", 200,
            headers=auth_headers()
        )

def _assert(condition, msg=""):
    if not condition:
        raise AssertionError(msg)

if __name__ == "__main__":
    run()
