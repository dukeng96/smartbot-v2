"use client"

import { useState } from "react"
import { MessageSquare } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { DataTableToolbar } from "@/components/shared/data-table-toolbar"
import { DataTablePagination } from "@/components/shared/data-table-pagination"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { ConversationListTable } from "@/components/features/conversations/conversation-list-table"
import { ConversationBotSelector } from "@/components/features/conversations/conversation-bot-selector"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useConversations, useArchiveConversation } from "@/lib/hooks/use-conversations"
import type { ConversationChannel, ConversationStatus } from "@/lib/types/conversation"

/**
 * E1 — Conversations list page.
 * Bot selector + channel/status filters + search + DataTable.
 */
export default function ConversationsPage() {
  const [botId, setBotId] = useState<string | undefined>()
  const [search, setSearch] = useState("")
  const [channel, setChannel] = useState<string>("")
  const [status, setStatus] = useState<string>("")
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch } = useConversations(botId, {
    search: search || undefined,
    channel: channel || undefined,
    status: status || undefined,
    page,
    limit: 20,
  })

  const archive = useArchiveConversation()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Cuộc hội thoại"
          description="Xem lại các cuộc trò chuyện giữa assistant và người dùng"
        />
        <LoadingSkeleton variant="table" rows={8} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Cuộc hội thoại"
          description="Xem lại các cuộc trò chuyện giữa assistant và người dùng"
        />
        <ErrorState onRetry={() => refetch()} />
      </div>
    )
  }

  const conversations = data?.items ?? []
  const meta = data?.meta

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuộc hội thoại"
        description="Xem lại các cuộc trò chuyện giữa assistant và người dùng"
      />

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm theo tên người dùng..."
        filters={
          <>
            <ConversationBotSelector
              bots={[]}
              value={botId}
              onChange={setBotId}
            />
            <ChannelFilter value={channel} onChange={setChannel} />
            <StatusFilter value={status} onChange={setStatus} />
          </>
        }
      />

      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Chưa có cuộc hội thoại"
          description="Cuộc hội thoại sẽ xuất hiện ở đây khi người dùng bắt đầu chat với assistant"
        />
      ) : (
        <>
          <ConversationListTable
            data={conversations}
            onArchive={(id) => archive.mutate(id)}
            archiving={archive.isPending}
          />
          {meta && (
            <DataTablePagination meta={meta} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  )
}

/** Channel filter dropdown */
function ChannelFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(!v || v === "all" ? "" : v)}>
      <SelectTrigger className="h-9 w-[150px] text-[13px]">
        <SelectValue placeholder="Tất cả kênh" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tất cả kênh</SelectItem>
        <SelectItem value="web_widget">Web Widget</SelectItem>
        <SelectItem value="facebook_messenger">Facebook</SelectItem>
        <SelectItem value="telegram">Telegram</SelectItem>
        <SelectItem value="zalo">Zalo</SelectItem>
        <SelectItem value="api">API</SelectItem>
      </SelectContent>
    </Select>
  )
}

/** Status filter dropdown */
function StatusFilter({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(!v || v === "all" ? "" : v)}>
      <SelectTrigger className="h-9 w-[150px] text-[13px]">
        <SelectValue placeholder="Tất cả trạng thái" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tất cả trạng thái</SelectItem>
        <SelectItem value="active">Đang hoạt động</SelectItem>
        <SelectItem value="closed">Đã đóng</SelectItem>
        <SelectItem value="archived">Đã lưu trữ</SelectItem>
      </SelectContent>
    </Select>
  )
}
