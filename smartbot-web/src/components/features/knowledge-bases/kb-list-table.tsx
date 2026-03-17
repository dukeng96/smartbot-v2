"use client"

import { useRouter } from "next/navigation"
import { MoreHorizontal, Eye, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type { KnowledgeBase } from "@/lib/types/knowledge-base"

interface KbListTableProps {
  data: KnowledgeBase[]
  onDelete: (kb: KnowledgeBase) => void
}

export function KbListTable({ data, onDelete }: KbListTableProps) {
  const router = useRouter()

  const columns: DataTableColumn<KnowledgeBase>[] = [
    {
      key: "name",
      header: "Tên",
      cell: (row) => (
        <span className="font-medium text-foreground">{row.name}</span>
      ),
    },
    {
      key: "description",
      header: "Mô tả",
      cell: (row) => (
        <span className="max-w-[200px] truncate block text-text-secondary">
          {row.description || "—"}
        </span>
      ),
    },
    {
      key: "totalDocuments",
      header: "Tài liệu",
      cell: (row) => row.totalDocuments.toLocaleString("vi-VN"),
      className: "w-[100px]",
    },
    {
      key: "totalChars",
      header: "Ký tự",
      cell: (row) => row.totalChars.toLocaleString("vi-VN"),
      className: "w-[100px]",
    },
    {
      key: "status",
      header: "Trạng thái",
      cell: (row) => <StatusBadge status={row.status as "active"} />,
      className: "w-[110px]",
    },
    {
      key: "createdAt",
      header: "Ngày tạo",
      cell: (row) =>
        formatDistanceToNow(new Date(row.createdAt), { addSuffix: true, locale: vi }),
      className: "w-[140px]",
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => router.push(`/knowledge-bases/${row.id}`)}
              >
                <Eye className="size-4" />
                Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(row)}>
                <Trash2 className="size-4" />
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      className: "w-[60px]",
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={data}
      rowKey={(row) => row.id}
      onRowClick={(row) => router.push(`/knowledge-bases/${row.id}`)}
    />
  )
}
