"use client"

import { useState, useCallback } from "react"
import { Bot, Plus } from "lucide-react"

import { useBots, useDeleteBot, useDuplicateBot } from "@/lib/hooks/use-bots"
import type { Bot as BotType } from "@/lib/types/bot"
import type { BotStatus } from "@/lib/types/bot"
import { PageHeader } from "@/components/layout/page-header"
import { DataTableToolbar } from "@/components/shared/data-table-toolbar"
import { DataTablePagination } from "@/components/shared/data-table-pagination"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { BotCardGrid } from "@/components/features/bots/bot-card-grid"
import { BotCreateDialog } from "@/components/features/bots/bot-create-dialog"

export default function BotsPage() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string>("")
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BotType | null>(null)

  const params = {
    page,
    limit: 10,
    search: search || undefined,
    status: status || undefined,
  }

  const { data, isLoading, isError, refetch } = useBots(params)
  const deleteBot = useDeleteBot()
  const duplicateBot = useDuplicateBot()

  const handleDuplicate = useCallback((bot: BotType) => {
    duplicateBot.mutate(bot.id)
  }, [duplicateBot])

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteBot.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
  }, [deleteTarget, deleteBot])

  const bots = data?.items ?? []
  const isEmpty = !isLoading && !isError && bots.length === 0

  return (
    <div className="space-y-6">
      {isEmpty && !search && !status ? (
        <EmptyState
          icon={Bot}
          title="Chưa có assistant nào"
          description="Tạo assistant đầu tiên để bắt đầu"
        >
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 size-4" /> Tạo Assistant mới
          </Button>
        </EmptyState>
      ) : (
        <>
          <PageHeader
            title="Assistants"
            description="Quản lý các AI assistant của bạn"
            actions={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 size-4" /> Tạo Assistant mới
              </Button>
            }
          />

          <DataTableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Tìm kiếm assistant..."
            filters={
              <Select value={status} onValueChange={(v: string | null) => { setStatus(!v || v === "all" ? "" : v); setPage(1) }}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            }
          />

          {isLoading && <LoadingSkeleton variant="cards" rows={4} />}
          {isError && <ErrorState onRetry={() => refetch()} />}
          {!isLoading && !isError && bots.length === 0 && (
            <EmptyState icon={Bot} title="Không tìm thấy assistant" description="Thử thay đổi bộ lọc" />
          )}
          {!isLoading && !isError && bots.length > 0 && (
            <>
              <BotCardGrid bots={bots} onDuplicate={handleDuplicate} onDelete={setDeleteTarget} />
              {data?.meta && <DataTablePagination meta={data.meta} onPageChange={setPage} />}
            </>
          )}
        </>
      )}

      <BotCreateDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Xóa Assistant"
        message={`Bạn có chắc muốn xóa "${deleteTarget?.name}"? Hành động này không thể hoàn tác.`}
        onConfirm={handleConfirmDelete}
        loading={deleteBot.isPending}
      />
    </div>
  )
}
