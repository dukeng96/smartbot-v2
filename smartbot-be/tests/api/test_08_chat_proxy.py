"""Chat Proxy Module Tests — /api/v1/chat (Public Widget API)"""
import requests
from test_config import state, BASE_URL, auth_headers, run_test

def run():
    print("\n=== 8. CHAT PROXY MODULE ===")

    if not state.bot_id:
        print("  [!] SKIP — no bot_id available")
        return

    bid = state.bot_id

    # TC-CHAT-01: Get bot config (widget)
    run_test(
        "TC-CHAT-01", "Get bot config (widget)", "GET",
        f"/api/v1/chat/{bid}/config", 200
    )

    # TC-CHAT-02: Get bot config (inactive/draft bot)
    if state.draft_bot_id:
        run_test(
            "TC-CHAT-02", "Get config (inactive bot)", "GET",
            f"/api/v1/chat/{state.draft_bot_id}/config", 404
        )
    else:
        print("  [~] TC-CHAT-02: SKIP — no draft_bot_id")

    # TC-CHAT-03: Send message (SSE stream) — test that endpoint responds with SSE headers
    try:
        resp = requests.post(
            f"{BASE_URL}/api/v1/chat/{bid}/messages",
            json={
                "message": "What is your return policy?",
                "conversationId": None,
                "endUserId": "end-user-test-123",
                "endUserName": "Test User"
            },
            headers={"Content-Type": "application/json"},
            stream=True,
            timeout=15
        )
        # SSE should return 200/201 with text/event-stream
        is_sse = "text/event-stream" in resp.headers.get("content-type", "")
        status_ok = resp.status_code in (200, 201)

        # Try to read first event to get conversationId
        conv_id_from_stream = None
        if is_sse and status_ok:
            import json as json_mod
            for line in resp.iter_lines(decode_unicode=True):
                if line and line.startswith("data:"):
                    try:
                        data = json_mod.loads(line[5:].strip())
                        if "conversationId" in data:
                            conv_id_from_stream = data["conversationId"]
                            state.conv_id = conv_id_from_stream
                    except Exception:
                        pass
                    break
        resp.close()

        passed = status_ok
        detail = f"Status {resp.status_code}, SSE={is_sse}"
        if conv_id_from_stream:
            detail += f", conv={conv_id_from_stream[:8]}..."

        from test_config import results
        results.append({"id": "TC-CHAT-03", "desc": "Send message (SSE)", "passed": passed, "detail": detail})
        icon = "+" if passed else "!"
        print(f"  [{icon}] TC-CHAT-03: Send message (SSE) — {detail}")

    except Exception as e:
        from test_config import results
        results.append({"id": "TC-CHAT-03", "desc": "Send message (SSE)", "passed": False, "detail": str(e)})
        print(f"  [!] TC-CHAT-03: Send message (SSE) — Error: {e}")

    # TC-CHAT-04: Get conversation history
    if state.conv_id:
        run_test(
            "TC-CHAT-04", "Get conversation history", "GET",
            f"/api/v1/chat/{bid}/conversations/{state.conv_id}/messages", 200,
            headers={"X-End-User-Id": "end-user-test-123"}
        )
    else:
        print("  [~] TC-CHAT-04: SKIP — no conv_id from SSE")

if __name__ == "__main__":
    run()
