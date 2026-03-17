import { MessageSquare } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"

/**
 * E1 — Conversation list with bot selector + filters.
 * Data: GET /api/v1/conversations
 */
export default function ConversationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuộc hội thoại"
        description="Xem lại các cuộc trò chuyện giữa bot và người dùng"
      />

      {/* TODO: Bot selector dropdown + DataTableToolbar + DataTable */}

      <EmptyState
        icon={MessageSquare}
        title="Chưa có cuộc hội thoại"
        description="Cuộc hội thoại sẽ xuất hiện ở đây khi người dùng bắt đầu chat với bot"
      />
    </div>
  )
}
