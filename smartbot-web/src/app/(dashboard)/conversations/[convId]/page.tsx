import { PageHeader } from "@/components/layout/page-header"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"

/**
 * E2 — Conversation detail. Chat thread + RAG debug panel.
 * Two-column: chat messages (left) + debug/source panel (right).
 * Data: GET /api/v1/conversations/:convId + /messages
 */
export default function ConversationDetailPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Chi tiết hội thoại" />
      {/* TODO: Chat message list + RAG debug panel (two-column) */}
      <LoadingSkeleton variant="detail" />
    </div>
  )
}
