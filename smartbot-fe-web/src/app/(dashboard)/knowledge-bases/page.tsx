"use client"

import { useState } from "react"
import { Database, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { DataTableToolbar } from "@/components/shared/data-table-toolbar"
import { DataTablePagination } from "@/components/shared/data-table-pagination"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { KbListTable } from "@/components/features/knowledge-bases/kb-list-table"
import { KbCreateDialog } from "@/components/features/knowledge-bases/kb-create-dialog"
import { useKnowledgeBases, useDeleteKnowledgeBase } from "@/lib/hooks/use-knowledge-bases"
import type { KnowledgeBase } from "@/lib/types/knowledge-base"

/**
 * D1 — Knowledge Base list page.
 * Handles: loading, empty, error, success states.
 */
export default function KnowledgeBasesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeBase | null>(null)

  const { data, isLoading, isError, refetch } = useKnowledgeBases({
    page,
    limit: 20,
    search: search || undefined,
  })

  const deleteMutation = useDeleteKnowledgeBase()

  function handleDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Knowledge Bases" />
        <LoadingSkeleton variant="table" />
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Knowledge Bases" />
        <ErrorState onRetry={() => refetch()} />
      </div>
    )
  }

  const items = data?.items ?? []
  const meta = data?.meta
  const isEmpty = items.length === 0 && !search

  // Empty state
  if (isEmpty) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={Database}
          title="Chưa có Knowledge Base nào"
          description="Tạo Knowledge Base đầu tiên và upload tài liệu để assistant trả lời chính xác hơn"
        >
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            Tạo Knowledge Base
          </Button>
        </EmptyState>
        <KbCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    )
  }

  // Success state
  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Bases"
        description="Quản lý nguồn tri thức cho AI assistant"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            Tạo mới
          </Button>
        }
      />

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm kiếm knowledge base..."
      />

      <div className="rounded-xl border border-border bg-card">
        <KbListTable data={items} onDelete={setDeleteTarget} />
        {meta && <DataTablePagination meta={meta} onPageChange={setPage} />}
      </div>

      <KbCreateDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa Knowledge Base"
        message={`Bạn có chắc muốn xóa "${deleteTarget?.name}"? Hành động này không thể hoàn tác.`}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
