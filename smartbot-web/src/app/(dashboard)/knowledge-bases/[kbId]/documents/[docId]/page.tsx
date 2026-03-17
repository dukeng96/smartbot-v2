"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { DocumentDetailView } from "@/components/features/knowledge-bases/document-detail-view"
import { useKnowledgeBase } from "@/lib/hooks/use-knowledge-bases"
import { useDocument } from "@/lib/hooks/use-documents"

/**
 * D4 — Document detail page.
 * Shows document metadata, processing status, stats, and actions.
 * Handles: loading, error, success states.
 */
export default function DocumentDetailPage() {
  const { kbId, docId } = useParams<{ kbId: string; docId: string }>()
  const router = useRouter()

  const { data: kb } = useKnowledgeBase(kbId)
  const { data: doc, isLoading, isError, refetch } = useDocument(kbId, docId)

  const breadcrumb = (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => router.push(`/knowledge-bases/${kbId}/documents`)}
      >
        <ArrowLeft className="size-4" />
      </Button>
      <span className="text-[13px] text-text-muted">
        Knowledge Bases / {kb?.name ?? "..."} / Tài liệu / {doc?.originalName ?? "..."}
      </span>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        {breadcrumb}
        <PageHeader title="Chi tiết tài liệu" />
        <LoadingSkeleton variant="detail" />
      </div>
    )
  }

  if (isError || !doc) {
    return (
      <div className="space-y-6">
        {breadcrumb}
        <PageHeader title="Chi tiết tài liệu" />
        <ErrorState onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {breadcrumb}
      <PageHeader title={doc.originalName || doc.sourceUrl || "Văn bản"} />
      <DocumentDetailView
        kbId={kbId}
        doc={doc}
        onDeleted={() => router.push(`/knowledge-bases/${kbId}/documents`)}
      />
    </div>
  )
}
