"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Archive, Eye, MoreHorizontal, Star } from "lucide-react"

import type { Conversation } from "@/lib/types/conversation"
import { CHANNEL_LABELS, STATUS_LABELS } from "@/lib/types/conversation"
import { formatRelativeTime } from "@/lib/utils/format-date"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ConversationListTableProps {
  data: Conversation[]
  onArchive: (convId: string) => void
  archiving?: boolean
}

/** Render star rating (1-5) */
function RatingStars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-text-muted">—</span>
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${
            i < rating
              ? "fill-[#F59E0B] text-[#F59E0B]"
              : "text-[#E5E7EB]"
          }`}
        />
      ))}
    </div>
  )
}

/** Map conversation status to StatusBadge variant */
function statusVariant(s: string) {
  if (s === "active") return "active"
  if (s === "closed") return "completed"
  return "draft"
}

/** Map channel to StatusBadge variant */
function channelVariant(ch: string) {
  if (ch === "web_widget") return "active"
  if (ch === "api") return "draft"
  return "processing"
}

export function ConversationListTable({
  data,
  onArchive,
  archiving,
}: ConversationListTableProps) {
  const router = useRouter()
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null)

  const columns: DataTableColumn<Conversation>[] = [
    {
      key: "user",
      header: "Người dùng",
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarFallback className="text-[11px] bg-muted">
              {(row.endUserName ?? "U")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground">
            {row.endUserName ?? "Ẩn danh"}
          </span>
        </div>
      ),
    },
    {
      key: "channel",
      header: "Kênh",
      cell: (row) => (
        <StatusBadge
          status={channelVariant(row.channel) as "active"}
          label={CHANNEL_LABELS[row.channel]}
        />
      ),
    },
    {
      key: "messages",
      header: "Tin nhắn",
      cell: (row) => row.messageCount,
      className: "w-[90px]",
    },
    {
      key: "lastActivity",
      header: "Hoạt động",
      cell: (row) => (
        <span className="text-text-secondary">
          {formatRelativeTime(row.lastMessageAt)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      cell: (row) => (
        <StatusBadge
          status={statusVariant(row.status) as "active"}
          label={STATUS_LABELS[row.status]}
        />
      ),
    },
    {
      key: "rating",
      header: "Đánh giá",
      cell: (row) => <RatingStars rating={row.rating} />,
      className: "w-[120px]",
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" />}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/conversations/${row.id}`)
              }}
            >
              <Eye className="mr-2 size-4" />
              Xem
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-[#DC2626]"
              onClick={(e) => {
                e.stopPropagation()
                setArchiveTarget(row.id)
              }}
            >
              <Archive className="mr-2 size-4" />
              Lưu trữ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-[48px]",
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/conversations/${r.id}`)}
      />
      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Lưu trữ cuộc hội thoại"
        message="Bạn có chắc muốn lưu trữ cuộc hội thoại này? Bạn có thể khôi phục sau."
        confirmLabel="Lưu trữ"
        onConfirm={() => {
          if (archiveTarget) {
            onArchive(archiveTarget)
            setArchiveTarget(null)
          }
        }}
        loading={archiving}
      />
    </>
  )
}
