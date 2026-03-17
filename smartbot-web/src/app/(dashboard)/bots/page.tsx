import { Bot, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"

/**
 * C1 — Bot list. Paginated, filterable by status.
 * Data: GET /api/v1/bots
 */
export default function BotsPage() {
  // TODO: Replace with actual data fetching via useSuspenseQuery
  const bots: unknown[] = []
  const isEmpty = bots.length === 0

  return (
    <div className="space-y-6">
      {isEmpty ? (
        <EmptyState
          icon={Bot}
          title="Chưa có assistant nào"
          description="Tạo assistant đầu tiên để bắt đầu"
        >
          <Button className="mt-4">
            <Plus className="mr-1.5 size-4" />
            Tạo Assistant mới
          </Button>
        </EmptyState>
      ) : (
        <>
          <PageHeader
            title="Assistants"
            description="Quản lý các AI assistant của bạn"
            actions={
              <Button>
                <Plus className="mr-1.5 size-4" />
                Tạo Assistant mới
              </Button>
            }
          />

          {/* TODO: DataTableToolbar + BotCardGrid + DataTablePagination */}
        </>
      )}
    </div>
  )
}
