"""Bots Module API Tests — /api/v1/bots"""
import requests
from test_config import state, auth_headers, run_test, BASE_URL

def run():
    print("\n=== 4. BOTS MODULE ===")

    # TC-BOT-01: Create Bot
    # Accept 402 (quota exceeded on re-run) — no check_fn since 402 has no bot data
    ok, body, resp = run_test(
        "TC-BOT-01", "Create bot", "POST", "/api/v1/bots", [201, 402],
        json_data={"name": "My First Bot", "description": "A helpful customer service assistant"},
        headers=auth_headers()
    )
    if ok and body and resp and resp.status_code == 201:
        d = body.get("data", body)
        state.bot_id = d.get("id", "")
    if not state.bot_id:
        # Quota exceeded or no id — fetch existing bots
        print("  [~] TC-BOT-01: No bot created, fetching existing bot")
        try:
            r = requests.get(f"{BASE_URL}/api/v1/bots", headers=auth_headers(), timeout=10)
            if r.status_code == 200:
                data = r.json()
                d = data.get("data", data)
                # TransformInterceptor wraps in { data: T }, PaginatedResult has { data: [...], meta: {...} }
                items = d.get("data", d) if isinstance(d, dict) else d
                if isinstance(items, list) and len(items) > 0:
                    state.bot_id = items[0].get("id", "")
                    print(f"  [~] Using existing bot: {state.bot_id[:8]}...")
        except Exception as e:
            print(f"  [!] Could not fetch existing bot: {e}")

    # TC-BOT-02: Create Bot (Quota Exceeded — Free=1 bot, Starter=5 bots)
    # Accept 402 (quota exceeded) or 201 (plan allows more bots)
    ok2, body2, _ = run_test(
        "TC-BOT-02", "Create bot quota exceeded", "POST", "/api/v1/bots", [402, 201],
        json_data={"name": "Second Bot"},
        headers=auth_headers()
    )
    extra_bot_id = ""
    if ok2 and body2 and isinstance(body2, dict):
        d2 = body2.get("data", body2)
        extra_bot_id = d2.get("id", "")

    # TC-BOT-03: List Bots
    run_test(
        "TC-BOT-03", "List bots", "GET", "/api/v1/bots", 200,
        headers=auth_headers(),
        params={"page": 1, "limit": 10}
    )

    # TC-BOT-04: List Bots with Status Filter
    run_test(
        "TC-BOT-04", "List bots filtered by status", "GET", "/api/v1/bots", 200,
        headers=auth_headers(),
        params={"status": "draft"}
    )

    if not state.bot_id:
        print("  [!] Remaining bot tests SKIP — no bot_id")
        return

    bid = state.bot_id

    # TC-BOT-05: Get Bot Detail
    run_test(
        "TC-BOT-05", "Get bot detail", "GET", f"/api/v1/bots/{bid}", 200,
        headers=auth_headers()
    )

    # TC-BOT-06: Update Bot
    run_test(
        "TC-BOT-06", "Update bot", "PATCH", f"/api/v1/bots/{bid}", 200,
        json_data={"name": "Updated Bot Name", "status": "active", "topK": 10, "memoryTurns": 8},
        headers=auth_headers()
    )

    # TC-BOT-09: Get Personality
    run_test(
        "TC-BOT-09", "Get personality", "GET", f"/api/v1/bots/{bid}/personality", 200,
        headers=auth_headers()
    )

    # TC-BOT-10: Update Personality
    run_test(
        "TC-BOT-10", "Update personality", "PATCH", f"/api/v1/bots/{bid}/personality", 200,
        json_data={
            "systemPrompt": "You are a helpful Vietnamese assistant",
            "greetingMessage": "Xin chao! Toi co the giup gi cho ban?",
            "suggestedQuestions": ["Gioi thieu san pham", "Gia ca", "Lien he"],
            "fallbackMessage": "Xin loi, toi khong hieu cau hoi cua ban.",
            "personality": {"tone": "friendly", "language": "vi"}
        },
        headers=auth_headers()
    )

    # TC-BOT-11: Update Widget Config
    run_test(
        "TC-BOT-11", "Update widget config", "PATCH", f"/api/v1/bots/{bid}/widget", 200,
        json_data={
            "theme": "dark", "primaryColor": "#2563eb", "position": "bottom-right",
            "showPoweredBy": True, "headerText": "Chat with us"
        },
        headers=auth_headers()
    )

    # TC-BOT-12: Preview Widget HTML
    run_test(
        "TC-BOT-12", "Preview widget HTML", "GET", f"/api/v1/bots/{bid}/widget/preview", 200,
        headers=auth_headers()
    )

    # TC-BOT-13: Generate API Key
    run_test(
        "TC-BOT-13", "Generate API key", "POST", f"/api/v1/bots/{bid}/api-key", 201,
        headers=auth_headers(),
        check_fn=lambda b, r: _assert(
            (b.get("data", b).get("apiKey") or b.get("apiKey", "")),
            "Missing apiKey in response"
        )
    )

    # TC-BOT-14: Revoke API Key
    run_test(
        "TC-BOT-14", "Revoke API key", "DELETE", f"/api/v1/bots/{bid}/api-key", 200,
        headers=auth_headers()
    )

    # TC-BOT-15: Get Embed Code
    run_test(
        "TC-BOT-15", "Get embed code", "GET", f"/api/v1/bots/{bid}/embed-code", 200,
        headers=auth_headers(),
        check_fn=lambda b, r: _assert(
            (b.get("data", b).get("iframe") or b.get("iframe", "")),
            "Missing iframe in embed code"
        )
    )

    # TC-BOT-20: Bot Not Found
    run_test(
        "TC-BOT-20", "Bot not found", "GET",
        "/api/v1/bots/00000000-0000-0000-0000-000000000000", 404,
        headers=auth_headers()
    )

    # Clean up extra bot before duplicate to free quota
    if extra_bot_id:
        requests.delete(f"{BASE_URL}/api/v1/bots/{extra_bot_id}", headers=auth_headers(), timeout=10)

    # TC-BOT-08: Duplicate Bot (do before delete to test it)
    # Accept 201 (success) or 402 (quota exceeded depending on plan)
    ok, body, _ = run_test(
        "TC-BOT-08", "Duplicate bot", "POST", f"/api/v1/bots/{bid}/duplicate", [201, 402],
        headers=auth_headers()
    )
    # Store draft bot for later (chat proxy test)
    if ok and body and isinstance(body, dict):
        d = body.get("data", body)
        state.draft_bot_id = d.get("id", "")

    # TC-BOT-07: Soft Delete Bot — delete the duplicated bot (not the main one)
    if state.draft_bot_id:
        run_test(
            "TC-BOT-07", "Soft delete bot", "DELETE", f"/api/v1/bots/{state.draft_bot_id}", 200,
            headers=auth_headers()
        )

def _assert(condition, msg=""):
    if not condition:
        raise AssertionError(msg)

if __name__ == "__main__":
    run()
