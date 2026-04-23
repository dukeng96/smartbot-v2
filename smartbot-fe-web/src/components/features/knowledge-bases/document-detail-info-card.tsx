"use client"

import { FileText, Link, Type } from "lucide-react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { StatusBadge } from "@/components/shared/status-badge"
import type { KBDocument } from "@/lib/types/document"

const SOURCE_ICONS = {
  file_upload: FileText,
  url_crawl: Link,
  text_input: Type,
} as const

const SOURCE_LABELS = {
  file_upload: "File upload",
  url_crawl: "URL crawl",
  text_input: "Text input",
} as const

interface DocumentDetailInfoCardProps {
  doc: KBDocument
  onToggle: (enabled: boolean) => void
}

function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentDetailInfoCard({ doc, onToggle }: DocumentDetailInfoCardProps) {
  const Icon = SOURCE_ICONS[doc.sourceType]
  const displayName = doc.originalName || doc.sourceUrl || "Văn bản"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin tài liệu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File identity */}
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-5 text-text-muted" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold">{displayName}</p>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={doc.status} />
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <p className="text-text-muted">Loại nguồn</p>
            <p className="font-medium">{SOURCE_LABELS[doc.sourceType]}</p>
          </div>
          {doc.mimeType && (
            <div>
              <p className="text-text-muted">MIME type</p>
              <p className="font-medium">{doc.mimeType}</p>
            </div>
          )}
          {doc.fileSize != null && (
            <div>
              <p className="text-text-muted">Kích thước</p>
              <p className="font-medium">{formatFileSize(doc.fileSize)}</p>
            </div>
          )}
          {doc.sourceUrl && (
            <div className="col-span-2">
              <p className="text-text-muted">URL</p>
              <a
                href={doc.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline truncate block"
              >
                {doc.sourceUrl}
              </a>
            </div>
          )}
          <div>
            <p className="text-text-muted">Ngày tạo</p>
            <p className="font-medium">
              {format(new Date(doc.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
            </p>
          </div>
          <div>
            <p className="text-text-muted">Bật/Tắt</p>
            <Switch
              size="sm"
              checked={doc.enabled}
              onCheckedChange={(checked) => onToggle(!!checked)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
