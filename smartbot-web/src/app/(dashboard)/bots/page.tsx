import { Bot, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"

/**
 * C1 — Bot list. Paginated, filterable by status.
 * Data: GET /api/v1/bots
 */
export default function BotsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bots"
        description="Quản lý các AI assistant của bạn"
        actions={
          <Button>
            <Plus className="mr-1.5 size-4" />
            Tạo bot mới
          </Button>
        }
      />

      {/* TODO: DataTableToolbar + DataTable + DataTablePagination */}

      <EmptyState
        icon={Bot}
        title="Chưa có bot nào"
        description="Tạo bot đầu tiên để bắt đầu"
      />
    </div>
  )
}
