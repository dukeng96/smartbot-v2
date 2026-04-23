"use client"

import { useRouter } from "next/navigation"
import { MoreHorizontal, RotateCw, Trash2, FileText, Link, Type } from "lucide-react"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { DocumentProcessingBadge } from "./document-processing-badge"
import type { KBDocument } from "@/lib/types/document"

const SOURCE_CONFIG = {
  file_upload: { label: "File", icon: FileText, bg: "bg-[#EFF6FF]", text: "text-[#2563EB]" },
  url_crawl: { label: "URL", icon: Link, bg: "bg-[#ECFDF5]", text: "text-[#059669]" },
  text_input: { label: "Text", icon: Type, bg: "bg-[#EDE9FE]", text: "text-[#6D28D9]" },
} as const

interface DocumentListTableProps {
  kbId: string
  data: KBDocument[]
  onToggle: (docId: string, enabled: boolean) => void
  onReprocess: (docId: string) => void
  onDelete: (doc: KBDocument) => void
}

export function DocumentListTable({
  kbId,
  data,
  onToggle,
  onReprocess,
  onDelete,
}: DocumentListTableProps) {
  const router = useRouter()

  const columns: DataTableColumn<KBDocument>[] = [
    {
      key: "originalName",
      header: "Tên nguồn",
      cell: (row) => (
        <span className="font-medium text-foreground truncate block max-w-[200px]">
          {row.originalName || row.sourceUrl || "Văn bản"}
        </span>
      ),
    },
    {
      key: "sourceType",
      header: "Loại",
      cell: (row) => {
        const cfg = SOURCE_CONFIG[row.sourceType]
        const Icon = cfg.icon
        return (
          <Badge variant="outline" className={`border-0 gap-1 ${cfg.bg} ${cfg.text}`}>
            <Icon className="size-3" />
            {cfg.label}
          </Badge>
        )
      },
      className: "w-[90px]",
    },
    {
      key: "status",
      header: "Trạng thái",
      cell: (row) => {
        if (row.status === "error" && row.errorMessage) {
          return (
            <Tooltip>
              <TooltipTrigger>
                <DocumentProcessingBadge
                  status={row.status}
                  processingStep={row.processingStep}
                  processingProgress={row.processingProgress}
                />
              </TooltipTrigger>
              <TooltipContent>{row.errorMessage}</TooltipContent>
            </Tooltip>
          )
        }
        return (
          <DocumentProcessingBadge
            status={row.status}
            processingStep={row.processingStep}
            processingProgress={row.processingProgress}
          />
        )
      },
      className: "w-[140px]",
    },
    {
      key: "charCount",
      header: "Ký tự",
      cell: (row) => row.charCount.toLocaleString("vi-VN"),
      className: "w-[90px]",
    },
    {
      key: "chunkCount",
      header: "Chunks",
      cell: (row) => row.chunkCount.toLocaleString("vi-VN"),
      className: "w-[80px]",
    },
    {
      key: "enabled",
      header: "Bật/Tắt",
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Switch
            size="sm"
            checked={row.enabled}
            onCheckedChange={(checked) => onToggle(row.id, !!checked)}
          />
        </div>
      ),
      className: "w-[70px]",
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onReprocess(row.id)}>
                <RotateCw className="size-4" />
                Reprocess
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
      onRowClick={(row) =>
        router.push(`/knowledge-bases/${kbId}/documents/${row.id}`)
      }
    />
  )
}
