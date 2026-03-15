"""Internal Documents Callback Tests — /api/v1/internal/documents"""
from test_config import state, internal_headers, run_test

def run():
    print("\n=== 7. INTERNAL DOCUMENTS CALLBACK ===")

    doc_id = state.doc_text_id or state.doc_id
    if not doc_id:
        print("  [!] SKIP — no doc_id available")
        return

    # TC-INTERNAL-01: Update status to completed
    run_test(
        "TC-INTERNAL-01", "Update status (completed)", "PATCH",
        f"/api/v1/internal/documents/{doc_id}/status", 200,
        json_data={"status": "completed", "charCount": 15000, "chunkCount": 25},
        headers=internal_headers()
    )

    # TC-INTERNAL-02: Update status to failed
    run_test(
        "TC-INTERNAL-02", "Update status (failed)", "PATCH",
        f"/api/v1/internal/documents/{doc_id}/status", 200,
        json_data={"status": "error", "errorMessage": "OCR failed: unsupported format"},
        headers=internal_headers()
    )

    # TC-INTERNAL-03: Invalid internal key
    run_test(
        "TC-INTERNAL-03", "Invalid internal key", "PATCH",
        f"/api/v1/internal/documents/{doc_id}/status", 401,
        json_data={"status": "completed"},
        headers={"X-Internal-Key": "wrong-key", "Content-Type": "application/json"}
    )

    # TC-INTERNAL-04: Missing internal key
    run_test(
        "TC-INTERNAL-04", "Missing internal key", "PATCH",
        f"/api/v1/internal/documents/{doc_id}/status", 401,
        json_data={"status": "completed"},
        headers={"Content-Type": "application/json"}
    )

if __name__ == "__main__":
    run()
