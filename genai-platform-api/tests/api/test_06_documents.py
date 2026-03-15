"""Documents Module API Tests — /api/v1/knowledge-bases/:kbId/documents"""
import os
import tempfile
from test_config import state, auth_headers, run_test

def run():
    print("\n=== 6. DOCUMENTS MODULE ===")

    if not state.kb_id:
        print("  [!] SKIP — no kb_id available")
        return

    kid = state.kb_id

    # TC-DOC-01: Upload File (create a temp txt file)
    tmp_path = os.path.join(tempfile.gettempdir(), "test_document.txt")
    with open(tmp_path, "w") as f:
        f.write("This is a test document for the knowledge base. " * 20)

    ok, body, _ = run_test(
        "TC-DOC-01", "Upload file", "POST",
        f"/api/v1/knowledge-bases/{kid}/documents/upload", 201,
        files={"file": ("test_document.txt", open(tmp_path, "rb"), "text/plain")}
    )
    if ok and body:
        d = body.get("data", body)
        state.doc_id = d.get("id", "")

    # TC-DOC-02: Create from URL
    ok, body, _ = run_test(
        "TC-DOC-02", "Create from URL", "POST",
        f"/api/v1/knowledge-bases/{kid}/documents/url", 201,
        json_data={"url": "https://example.com/faq"},
        headers=auth_headers()
    )
    if ok and body:
        d = body.get("data", body)
        state.doc_url_id = d.get("id", "")

    # TC-DOC-03: Create from Text
    ok, body, _ = run_test(
        "TC-DOC-03", "Create from text", "POST",
        f"/api/v1/knowledge-bases/{kid}/documents/text", 201,
        json_data={"name": "Company Policy", "content": "This is the company policy text content for testing. " * 10},
        headers=auth_headers()
    )
    if ok and body:
        d = body.get("data", body)
        state.doc_text_id = d.get("id", "")

    # TC-DOC-04: List Documents
    run_test(
        "TC-DOC-04", "List documents", "GET",
        f"/api/v1/knowledge-bases/{kid}/documents", 200,
        headers=auth_headers(),
        params={"page": 1, "limit": 10}
    )

    # TC-DOC-05: Get Document Detail
    doc_to_check = state.doc_id or state.doc_text_id
    if doc_to_check:
        run_test(
            "TC-DOC-05", "Get document detail", "GET",
            f"/api/v1/knowledge-bases/{kid}/documents/{doc_to_check}", 200,
            headers=auth_headers()
        )

    # TC-DOC-06: Update Document
    if state.doc_text_id:
        run_test(
            "TC-DOC-06", "Update document", "PATCH",
            f"/api/v1/knowledge-bases/{kid}/documents/{state.doc_text_id}", 200,
            json_data={"enabled": False},
            headers=auth_headers()
        )

    # TC-DOC-08: Reprocess Document
    if state.doc_text_id:
        run_test(
            "TC-DOC-08", "Reprocess document", "POST",
            f"/api/v1/knowledge-bases/{kid}/documents/{state.doc_text_id}/reprocess", 201,
            headers=auth_headers()
        )

    # TC-DOC-07: Soft Delete Document (delete the URL doc)
    if state.doc_url_id:
        run_test(
            "TC-DOC-07", "Soft delete document", "DELETE",
            f"/api/v1/knowledge-bases/{kid}/documents/{state.doc_url_id}", 200,
            headers=auth_headers()
        )

    # Cleanup temp file
    try:
        os.unlink(tmp_path)
    except Exception:
        pass

def _assert(condition, msg=""):
    if not condition:
        raise AssertionError(msg)

if __name__ == "__main__":
    run()
