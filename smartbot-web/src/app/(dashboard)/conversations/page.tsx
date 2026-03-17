import { MessageSquare } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"

/**
 * E1 — Conversation list with bot selector + filters.
 * Data: GET /api/v1/conversations
 */
export default function ConversationsPage() {
  // TODO: Replace with actual data fetching via useSuspenseQuery
  const conversations: unknown[] = []
  const isEmpty = conversations.length === 0

  return (
    <div className="space-y-6">
      {isEmpty ? (
        <EmptyState
          icon={MessageSquare}
          title="Chưa có cuộc hội thoại"
          description="Cuộc hội thoại sẽ xuất hiện ở đây khi người dùng bắt đầu chat với assistant"
        >
          <Button className="mt-4" variant="outline">
            Xem Assistants
          </Button>
        </EmptyState>
      ) : (
        <>
          <PageHeader
            title="Cuộc hội thoại"
            description="Xem lại các cuộc trò chuyện giữa assistant và người dùng"
          />

          {/* TODO: Bot selector dropdown + DataTableToolbar + DataTable */}
        </>
      )}
    </div>
  )
}
