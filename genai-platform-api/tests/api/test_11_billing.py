"""Billing Module Tests — /api/v1/plans, /api/v1/subscription, /api/v1/credits, /api/v1/payments"""
from test_config import state, auth_headers, run_test

def run():
    print("\n=== 11. BILLING MODULE ===")

    # TC-BILLING-01: List plans (public)
    ok, body, _ = run_test(
        "TC-BILLING-01", "List plans (public)", "GET",
        "/api/v1/plans", 200
    )
    if ok and body:
        plans = body.get("data", body) if isinstance(body, dict) else body
        if isinstance(plans, list):
            for p in plans:
                if p.get("slug") == "starter":
                    state.plan_starter_id = p.get("id", "")

    if not state.access_token:
        print("  [!] SKIP remaining — not authenticated")
        return

    # TC-BILLING-02: Get current subscription
    run_test(
        "TC-BILLING-02", "Get current subscription", "GET",
        "/api/v1/subscription", 200,
        headers=auth_headers()
    )

    # TC-BILLING-03: Subscribe/Upgrade to Starter
    if not state.plan_starter_id:
        print("  [!] TC-BILLING-03: SKIP — no plan_starter_id from TC-BILLING-01")
    else:
        ok, body, _ = run_test(
            "TC-BILLING-03", "Subscribe to Starter", "POST",
            "/api/v1/subscription", 201,
            json_data={"planId": state.plan_starter_id, "billingCycle": "monthly"},
            headers=auth_headers()
        )

    # TC-BILLING-04: Update billing cycle
    run_test(
        "TC-BILLING-04", "Update billing cycle", "PATCH",
        "/api/v1/subscription", 200,
        json_data={"billingCycle": "yearly"},
        headers=auth_headers()
    )

    # TC-BILLING-05: Cancel subscription
    run_test(
        "TC-BILLING-05", "Cancel subscription", "DELETE",
        "/api/v1/subscription", 200,
        headers=auth_headers()
    )

    # TC-BILLING-06: Top up credits
    run_test(
        "TC-BILLING-06", "Top up credits", "POST",
        "/api/v1/credits/top-up", 201,
        json_data={"amount": 1000},
        headers=auth_headers()
    )

    # TC-BILLING-07: Get credit usage
    run_test(
        "TC-BILLING-07", "Get credit usage", "GET",
        "/api/v1/credits/usage", 200,
        headers=auth_headers()
    )

    # TC-BILLING-08: Payment history
    run_test(
        "TC-BILLING-08", "Payment history", "GET",
        "/api/v1/payments", 200,
        headers=auth_headers(),
        params={"page": 1, "limit": 10}
    )

    # TC-BILLING-09: VNPay callback (stub)
    run_test(
        "TC-BILLING-09", "VNPay callback (stub)", "POST",
        "/api/v1/payments/vnpay/callback", 201,
        json_data={"vnp_TxnRef": "test123", "vnp_ResponseCode": "00"}
    )

    # TC-BILLING-10: MoMo callback (stub)
    run_test(
        "TC-BILLING-10", "MoMo callback (stub)", "POST",
        "/api/v1/payments/momo/callback", 201,
        json_data={"orderId": "test123", "resultCode": 0}
    )

if __name__ == "__main__":
    run()
