"""Channels Module Tests — /api/v1/bots/:botId/channels"""
from test_config import state, auth_headers, run_test

def run():
    print("\n=== 12. CHANNELS MODULE ===")

    if not state.bot_id:
        print("  [!] SKIP — no bot_id available")
        return

    bid = state.bot_id

    # TC-CH-01: Create channel (web widget)
    ok, body, _ = run_test(
        "TC-CH-01", "Create channel (web widget)", "POST",
        f"/api/v1/bots/{bid}/channels", 201,
        json_data={
            "type": "web_widget",
            "config": {"allowedDomains": ["example.com"]}
        },
        headers=auth_headers()
    )
    if ok and body:
        d = body.get("data", body)
        state.channel_id = d.get("id", "")

    # TC-CH-02: List channels
    run_test(
        "TC-CH-02", "List channels", "GET",
        f"/api/v1/bots/{bid}/channels", 200,
        headers=auth_headers()
    )

    # TC-CH-03: Update channel
    if state.channel_id:
        run_test(
            "TC-CH-03", "Update channel", "PATCH",
            f"/api/v1/bots/{bid}/channels/{state.channel_id}", 200,
            json_data={"status": "inactive", "config": {"allowedDomains": ["example.com", "test.com"]}},
            headers=auth_headers()
        )
    else:
        print("  [~] TC-CH-03: SKIP — no channel_id")

    # TC-CH-05: Connect Facebook (stub) — run before delete
    run_test(
        "TC-CH-05", "Connect Facebook (stub)", "POST",
        f"/api/v1/bots/{bid}/channels/facebook/connect", 201,
        json_data={"accessToken": "fake-token", "pageId": "12345"},
        headers=auth_headers()
    )

    # TC-CH-04: Delete channel
    if state.channel_id:
        run_test(
            "TC-CH-04", "Delete channel", "DELETE",
            f"/api/v1/bots/{bid}/channels/{state.channel_id}", 200,
            headers=auth_headers()
        )
    else:
        print("  [~] TC-CH-04: SKIP — no channel_id")

if __name__ == "__main__":
    run()
