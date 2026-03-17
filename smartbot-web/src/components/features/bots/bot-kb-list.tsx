"use client"

import { Database, Unlink } from "lucide-react"

import type { BotKnowledgeBase } from "@/lib/types/bot"
import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

interface BotKbListProps {
  knowledgeBases: BotKnowledgeBase[]
  onDetach: (kb: BotKnowledgeBase) => void
}

export function BotKbList({ knowledgeBases, onDetach }: BotKbListProps) {
  if (knowledgeBases.length === 0) {
    return (
      <EmptyState
        icon={Database}
        title="Chưa gắn Knowledge Base"
        description="Gắn Knowledge Base để assistant có thể trả lời dựa trên tài liệu của bạn"
      />
    )
  }

  const columns: DataTableColumn<BotKnowledgeBase>[] = [
    {
      key: "priority",
      header: "#",
      className: "w-16",
      cell: (row) => (
        <span className="font-mono text-[13px] text-text-muted">{row.priority}</span>
      ),
    },
    {
      key: "name",
      header: "Tên",
      cell: (row) => (
        <span className="text-[13px] font-medium text-foreground">{row.name}</span>
      ),
    },
    {
      key: "totalDocuments",
      header: "Tài liệu",
      cell: (row) => <span className="text-[13px]">{row.totalDocuments}</span>,
    },
    {
      key: "totalChars",
      header: "Ký tự",
      cell: (row) => (
        <span className="text-[13px] tabular-nums">
          {row.totalChars.toLocaleString("vi-VN")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      cell: (row) => <StatusBadge status={row.status as "active" | "processing" | "error"} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-24 text-right",
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onDetach(row) }}
          className="text-destructive hover:text-destructive"
        >
          <Unlink className="mr-1 size-3.5" /> Gỡ
        </Button>
      ),
    },
  ]

  return (
    <div>
      <DataTable
        columns={columns}
        data={knowledgeBases}
        rowKey={(row) => row.knowledgeBaseId}
      />
      <p className="mt-3 text-[12px] text-text-muted">
        Số ưu tiên thấp hơn = được tìm kiếm trước
      </p>
    </div>
  )
}
