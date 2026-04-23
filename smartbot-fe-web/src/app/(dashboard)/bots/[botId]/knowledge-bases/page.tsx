"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Plus } from "lucide-react"

import { useBotKnowledgeBases } from "@/lib/hooks/use-bots"
import { useDetachKb } from "@/lib/hooks/use-bot-integrations"
import type { BotKnowledgeBase } from "@/lib/types/bot"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { ErrorState } from "@/components/shared/error-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { BotKbList } from "@/components/features/bots/bot-kb-list"
import { BotKbAttachDialog } from "@/components/features/bots/bot-kb-attach-dialog"

/**
 * C6 — Attached knowledge bases tab.
 */
export default function BotKnowledgeBasesPage() {
  const { botId } = useParams<{ botId: string }>()
  const { data: kbs, isLoading, isError, refetch } = useBotKnowledgeBases(botId)
  const detachKb = useDetachKb(botId)
  const [attachOpen, setAttachOpen] = useState(false)
  const [detachTarget, setDetachTarget] = useState<BotKnowledgeBase | null>(null)

  if (isLoading) return <LoadingSkeleton variant="table" />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[var(--font-size-section-heading)] font-semibold text-foreground">
          Knowledge Bases
        </h2>
        <Button size="sm" onClick={() => setAttachOpen(true)}>
          <Plus className="mr-1.5 size-4" /> Gắn KB
        </Button>
      </div>

      <BotKbList knowledgeBases={kbs ?? []} onDetach={setDetachTarget} />

      <BotKbAttachDialog
        botId={botId}
        open={attachOpen}
        onOpenChange={setAttachOpen}
        attachedKbIds={(kbs ?? []).map((kb) => kb.knowledgeBaseId)}
      />

      <ConfirmDialog
        open={!!detachTarget}
        onOpenChange={(open) => { if (!open) setDetachTarget(null) }}
        title="Gỡ Knowledge Base"
        message={`Bạn có chắc muốn gỡ "${detachTarget?.name}"? Assistant sẽ không thể tìm kiếm KB này nữa.`}
        confirmLabel="Gỡ"
        onConfirm={() => {
          if (detachTarget) {
            detachKb.mutate(detachTarget.knowledgeBaseId, {
              onSuccess: () => setDetachTarget(null),
            })
          }
        }}
        loading={detachKb.isPending}
      />
    </div>
  )
}
