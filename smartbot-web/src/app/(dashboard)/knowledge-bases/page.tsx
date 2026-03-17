import { Database, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"

/**
 * D1 — Knowledge Base list.
 * Data: GET /api/v1/knowledge-bases
 */
export default function KnowledgeBasesPage() {
  // TODO: Replace with actual data fetching via useSuspenseQuery
  const knowledgeBases: unknown[] = []
  const isEmpty = knowledgeBases.length === 0

  return (
    <div className="space-y-6">
      {isEmpty ? (
        <EmptyState
          icon={Database}
          title="Chưa có Knowledge Base"
          description="Tạo Knowledge Base và upload tài liệu để assistant trả lời chính xác hơn"
        >
          <Button className="mt-4">
            <Plus className="mr-1.5 size-4" />
            Tạo Knowledge Base
          </Button>
        </EmptyState>
      ) : (
        <>
          <PageHeader
            title="Knowledge Bases"
            description="Quản lý nguồn tri thức cho AI assistant"
            actions={
              <Button>
                <Plus className="mr-1.5 size-4" />
                Tạo Knowledge Base
              </Button>
            }
          />

          {/* TODO: DataTableToolbar + DataTable + DataTablePagination */}
        </>
      )}
    </div>
  )
}
