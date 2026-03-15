"""Main runner for all API route tests.
Executes modules in dependency order per TESTING-PLAN.md §7.
"""
import sys
import os
import time

# Ensure the test directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_config import print_summary, results

import test_01_auth
import test_02_users
import test_03_tenants
import test_04_bots
import test_05_knowledge_bases
import test_06_documents
import test_07_internal
import test_08_chat_proxy
import test_09_conversations
import test_10_analytics
import test_11_billing
import test_12_channels
import test_13_webhooks
import test_14_cross_cutting

def main():
    print("=" * 70)
    print("  GenAI Platform API — Route Test Suite")
    print("=" * 70)

    start = time.time()

    modules = [
        test_01_auth,
        test_02_users,
        test_03_tenants,
        test_04_bots,
        test_05_knowledge_bases,
        test_06_documents,
        test_07_internal,
        test_08_chat_proxy,
        test_09_conversations,
        test_10_analytics,
        test_11_billing,
        test_12_channels,
        test_13_webhooks,
        test_14_cross_cutting,
    ]

    for mod in modules:
        try:
            mod.run()
        except Exception as e:
            print(f"\n  [!!!] Module {mod.__name__} crashed: {e}")

    elapsed = time.time() - start
    passed, failed = print_summary()

    print(f"\n  Time elapsed: {elapsed:.1f}s")
    print()

    # Exit with non-zero if any failures
    sys.exit(1 if failed > 0 else 0)

if __name__ == "__main__":
    main()
