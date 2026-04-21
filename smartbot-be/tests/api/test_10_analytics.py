"""Analytics Module Tests — /api/v1/analytics"""
from test_config import state, auth_headers, run_test

def run():
    print("\n=== 10. ANALYTICS MODULE ===")

    if not state.access_token:
        print("  [!] SKIP — not authenticated")
        return

    bid = state.bot_id

    # TC-ANALYTICS-01: Dashboard overview
    run_test(
        "TC-ANALYTICS-01", "Dashboard overview", "GET",
        "/api/v1/analytics/overview", 200,
        headers=auth_headers()
    )

    # TC-ANALYTICS-02: Conversations over time
    run_test(
        "TC-ANALYTICS-02", "Conversations over time", "GET",
        "/api/v1/analytics/conversations", 200,
        headers=auth_headers(),
        params={"period": "7d"}
    )

    # TC-ANALYTICS-03: Message volume
    run_test(
        "TC-ANALYTICS-03", "Message volume", "GET",
        "/api/v1/analytics/messages", 200,
        headers=auth_headers(),
        params={"period": "30d", "botId": bid} if bid else {"period": "30d"}
    )

    # TC-ANALYTICS-04: Credit usage
    run_test(
        "TC-ANALYTICS-04", "Credit usage", "GET",
        "/api/v1/analytics/credits", 200,
        headers=auth_headers(),
        params={"period": "30d"}
    )

    # TC-ANALYTICS-05: Channel breakdown
    run_test(
        "TC-ANALYTICS-05", "Channel breakdown", "GET",
        "/api/v1/analytics/channels", 200,
        headers=auth_headers(),
        params={"period": "30d"}
    )

    # TC-ANALYTICS-06: Top questions
    if bid:
        run_test(
            "TC-ANALYTICS-06", "Top questions", "GET",
            f"/api/v1/analytics/bots/{bid}/top-questions", 200,
            headers=auth_headers(),
            params={"limit": 10}
        )
    else:
        print("  [~] TC-ANALYTICS-06: SKIP — no bot_id")

    # TC-ANALYTICS-07: Satisfaction distribution
    if bid:
        run_test(
            "TC-ANALYTICS-07", "Satisfaction distribution", "GET",
            f"/api/v1/analytics/bots/{bid}/satisfaction", 200,
            headers=auth_headers()
        )
    else:
        print("  [~] TC-ANALYTICS-07: SKIP — no bot_id")

if __name__ == "__main__":
    run()
