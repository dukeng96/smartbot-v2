"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Upload, Link, Type, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { DataTableToolbar } from "@/components/shared/data-table-toolbar"
import { DataTablePagination } from "@/components/shared/data-table-pagination"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { DocumentListTable } from "@/components/features/knowledge-bases/document-list-table"
import { DocumentUploadDialog } from "@/components/features/knowledge-bases/document-upload-dialog"
import { DocumentUrlDialog } from "@/components/features/knowledge-bases/document-url-dialog"
import { DocumentTextDialog } from "@/components/features/knowledge-bases/document-text-dialog"
import { useKnowledgeBase } from "@/lib/hooks/use-knowledge-bases"
import {
  useDocuments,
  useToggleDocument,
  useReprocessDocument,
  useDeleteDocument,
} from "@/lib/hooks/use-documents"
import type { KBDocument } from "@/lib/types/document"

/**
 * D3 — Document list in Knowledge Base.
 * Handles: loading, empty, error, success states.
 */
export default function DocumentsPage() {
  const { kbId } = useParams<{ kbId: string }>()
  const router = useRouter()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [uploadOpen, setUploadOpen] = useState(false)
  const [urlOpen, setUrlOpen] = useState(false)
  const [textOpen, setTextOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<KBDocument | null>(null)

  const { data: kb } = useKnowledgeBase(kbId)
  const { data, isLoading, isError, refetch } = useDocuments(kbId, {
    page,
    limit: 20,
    search: search || undefined,
  })

  const toggleMutation = useToggleDocument(kbId)
  const reprocessMutation = useReprocessDocument(kbId)
  const deleteMutation = useDeleteDocument(kbId)

  const actionButtons = (
    <>
      <Button onClick={() => setUploadOpen(true)}>
        <Upload className="mr-1.5 size-4" />
        Upload tệp
      </Button>
      <Button variant="outline" onClick={() => setUrlOpen(true)}>
        <Link className="mr-1.5 size-4" />
        Thêm URL
      </Button>
      <Button variant="outline" onClick={() => setTextOpen(true)}>
        <Type className="mr-1.5 size-4" />
        Thêm văn bản
      </Button>
    </>
  )

  const breadcrumb = (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => router.push("/knowledge-bases")}
      >
        <ArrowLeft className="size-4" />
      </Button>
      <span className="text-[13px] text-text-muted">
        Knowledge Bases / {kb?.name ?? "..."} / Tài liệu
      </span>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        {breadcrumb}
        <PageHeader title="Tài liệu" />
        <LoadingSkeleton variant="table" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        {breadcrumb}
        <PageHeader title="Tài liệu" />
        <ErrorState onRetry={() => refetch()} />
      </div>
    )
  }

  const items = data?.items ?? []
  const meta = data?.meta
  const isEmpty = items.length === 0 && !search

  if (isEmpty) {
    return (
      <div className="space-y-6">
        {breadcrumb}
        <EmptyState
          icon={FileText}
          title="Chưa có tài liệu"
          description="Upload tài liệu PDF, DOCX, TXT để assistant có thể tham khảo"
        >
          <div className="mt-4 flex gap-2">{actionButtons}</div>
        </EmptyState>
        <DocumentUploadDialog kbId={kbId} open={uploadOpen} onOpenChange={setUploadOpen} />
        <DocumentUrlDialog kbId={kbId} open={urlOpen} onOpenChange={setUrlOpen} />
        <DocumentTextDialog kbId={kbId} open={textOpen} onOpenChange={setTextOpen} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {breadcrumb}
      <PageHeader
        title="Tài liệu"
        description="Quản lý tài liệu trong Knowledge Base"
        actions={<div className="flex gap-2">{actionButtons}</div>}
      />

      <DataTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm kiếm tài liệu..."
      />

      <div className="rounded-xl border border-border bg-card">
        <DocumentListTable
          kbId={kbId}
          data={items}
          onToggle={(docId, enabled) => toggleMutation.mutate({ docId, enabled })}
          onReprocess={(docId) => reprocessMutation.mutate(docId)}
          onDelete={setDeleteTarget}
        />
        {meta && <DataTablePagination meta={meta} onPageChange={setPage} />}
      </div>

      <DocumentUploadDialog kbId={kbId} open={uploadOpen} onOpenChange={setUploadOpen} />
      <DocumentUrlDialog kbId={kbId} open={urlOpen} onOpenChange={setUrlOpen} />
      <DocumentTextDialog kbId={kbId} open={textOpen} onOpenChange={setTextOpen} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Xóa tài liệu"
        message={`Bạn có chắc muốn xóa "${deleteTarget?.originalName || "tài liệu"}"? Hành động này không thể hoàn tác.`}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            })
          }
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
