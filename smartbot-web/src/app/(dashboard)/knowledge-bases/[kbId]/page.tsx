"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { KbDetailForm } from "@/components/features/knowledge-bases/kb-detail-form"
import { useKnowledgeBase, useDeleteKnowledgeBase } from "@/lib/hooks/use-knowledge-bases"

/**
 * D2 — Knowledge Base detail + settings page.
 * Handles: loading, error, success states.
 */
export default function KnowledgeBaseDetailPage() {
  const { kbId } = useParams<{ kbId: string }>()
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: kb, isLoading, isError, refetch } = useKnowledgeBase(kbId)
  const deleteMutation = useDeleteKnowledgeBase()

  function handleDelete() {
    deleteMutation.mutate(kbId, {
      onSuccess: () => router.push("/knowledge-bases"),
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Chi tiết Knowledge Base" />
        <LoadingSkeleton variant="detail" />
      </div>
    )
  }

  if (isError || !kb) {
    return (
      <div className="space-y-6">
        <PageHeader title="Chi tiết Knowledge Base" />
        <ErrorState onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onClick={() => router.push("/knowledge-bases")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <PageHeader
            title={kb.name}
            actions={
              <Button
                variant="outline"
                className="shrink-0 whitespace-nowrap"
                onClick={() => router.push(`/knowledge-bases/${kbId}/documents`)}
              >
                <FileText className="mr-1.5 size-4" />
                Xem tài liệu
              </Button>
            }
          />
        </div>
      </div>

      <KbDetailForm kb={kb} onDelete={() => setConfirmDelete(true)} />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Xóa Knowledge Base"
        message={`Bạn có chắc muốn xóa "${kb.name}"? Hành động này không thể hoàn tác.`}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
