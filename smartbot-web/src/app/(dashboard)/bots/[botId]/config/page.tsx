"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { useBot, useDeleteBot, useDuplicateBot } from "@/lib/hooks/use-bots"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { ErrorState } from "@/components/shared/error-state"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { BotConfigForm } from "@/components/features/bots/bot-config-form"

/**
 * C2 — Bot general config tab.
 */
export default function BotConfigPage() {
  const { botId } = useParams<{ botId: string }>()
  const router = useRouter()
  const { data: bot, isLoading, isError, refetch } = useBot(botId)
  const deleteBot = useDeleteBot()
  const duplicateBot = useDuplicateBot()
  const [showDelete, setShowDelete] = useState(false)

  if (isLoading) return <LoadingSkeleton variant="form" />
  if (isError || !bot) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="space-y-6">
      <h2 className="text-[var(--font-size-section-heading)] font-semibold text-foreground">
        Cấu hình chung
      </h2>

      <BotConfigForm
        bot={bot}
        onDuplicate={() => duplicateBot.mutate(bot.id)}
        onDelete={() => setShowDelete(true)}
      />

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Xóa Assistant"
        message={`Bạn có chắc muốn xóa "${bot.name}"? Hành động này không thể hoàn tác.`}
        onConfirm={() => {
          deleteBot.mutate(bot.id, {
            onSuccess: () => router.push("/bots"),
          })
        }}
        loading={deleteBot.isPending}
      />
    </div>
  )
}
