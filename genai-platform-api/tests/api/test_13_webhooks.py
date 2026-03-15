"""Webhooks Module Tests — /api/v1/webhooks"""
from test_config import run_test

def run():
    print("\n=== 13. WEBHOOKS MODULE ===")

    # TC-WH-01: Facebook verification (correct token)
    run_test(
        "TC-WH-01", "FB verify (correct token)", "GET",
        "/api/v1/webhooks/facebook", 200,
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "smartbot-fb-verify",
            "hub.challenge": "test_challenge_123"
        }
    )

    # TC-WH-02: Facebook verification (bad token)
    run_test(
        "TC-WH-02", "FB verify (bad token)", "GET",
        "/api/v1/webhooks/facebook", 200,
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong-token",
            "hub.challenge": "test"
        }
    )

    # TC-WH-03: Facebook webhook message
    run_test(
        "TC-WH-03", "FB webhook message", "POST",
        "/api/v1/webhooks/facebook", 201,
        json_data={
            "object": "page",
            "entry": [{"messaging": [{"message": {"text": "Hello"}}]}]
        }
    )

    # TC-WH-04: Telegram webhook
    run_test(
        "TC-WH-04", "Telegram webhook", "POST",
        "/api/v1/webhooks/telegram", 201,
        json_data={
            "update_id": 123,
            "message": {"text": "Hello"}
        }
    )

    # TC-WH-05: Zalo webhook
    run_test(
        "TC-WH-05", "Zalo webhook", "POST",
        "/api/v1/webhooks/zalo", 201,
        json_data={
            "event_name": "user_send_text",
            "message": {"text": "Hello"}
        }
    )

if __name__ == "__main__":
    run()
