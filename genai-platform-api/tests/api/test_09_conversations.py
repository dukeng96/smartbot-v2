"""Conversations Module Tests — /api/v1/bots/:botId/conversations"""
from test_config import state, auth_headers, run_test

def run():
    print("\n=== 9. CONVERSATIONS MODULE ===")

    if not state.bot_id:
        print("  [!] SKIP — no bot_id available")
        return

    bid = state.bot_id

    # TC-CONV-01: List conversations for bot
    ok, body, _ = run_test(
        "TC-CONV-01", "List conversations", "GET",
        f"/api/v1/bots/{bid}/conversations", 200,
        headers=auth_headers(),
        params={"page": 1, "limit": 10}
    )
    # Try to capture a conv_id if we don't have one
    if ok and body and not state.conv_id:
        data = body.get("data", [])
        if isinstance(data, list) and len(data) > 0:
            state.conv_id = data[0].get("id", "")

    # TC-CONV-02: Get conversation detail
    if state.conv_id:
        run_test(
            "TC-CONV-02", "Get conversation detail", "GET",
            f"/api/v1/conversations/{state.conv_id}", 200,
            headers=auth_headers()
        )
    else:
        print("  [~] TC-CONV-02: SKIP — no conv_id")

    # TC-CONV-03: List messages in conversation
    if state.conv_id:
        run_test(
            "TC-CONV-03", "List messages", "GET",
            f"/api/v1/conversations/{state.conv_id}/messages", 200,
            headers=auth_headers(),
            params={"page": 1, "limit": 20}
        )
    else:
        print("  [~] TC-CONV-03: SKIP — no conv_id")

    # TC-CONV-04: Archive conversation
    # We'll archive the conv_id if available — do this last since it modifies state
    # (skip for now to keep conv alive for other tests)

    # TC-CONV-05: Search messages
    run_test(
        "TC-CONV-05", "Search messages", "GET",
        f"/api/v1/bots/{bid}/messages/search", 200,
        headers=auth_headers(),
        params={"q": "hello", "page": 1, "limit": 10}
    )

    # TC-CONV-06: Rate conversation
    if state.conv_id:
        run_test(
            "TC-CONV-06", "Rate conversation", "POST",
            f"/api/v1/conversations/{state.conv_id}/rating", 201,
            json_data={"rating": 5, "feedbackText": "Very helpful!"},
            headers=auth_headers()
        )
    else:
        print("  [~] TC-CONV-06: SKIP — no conv_id")

    # TC-CONV-07: Message feedback (would need a message_id)
    # We'll skip if no messages exist from chat proxy
    print("  [~] TC-CONV-07: SKIP — requires message_id from chat")

    # TC-CONV-04: Archive conversation (last)
    if state.conv_id:
        run_test(
            "TC-CONV-04", "Archive conversation", "DELETE",
            f"/api/v1/conversations/{state.conv_id}", 200,
            headers=auth_headers()
        )
    else:
        print("  [~] TC-CONV-04: SKIP — no conv_id")

if __name__ == "__main__":
    run()
