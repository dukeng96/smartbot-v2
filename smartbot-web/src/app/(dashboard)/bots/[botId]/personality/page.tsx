"use client"

import { useParams } from "next/navigation"

import { useBot } from "@/lib/hooks/use-bots"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { ErrorState } from "@/components/shared/error-state"
import { BotPersonalityForm } from "@/components/features/bots/bot-personality-form"

/**
 * C3 — Bot personality tab.
 */
export default function BotPersonalityPage() {
  const { botId } = useParams<{ botId: string }>()
  const { data: bot, isLoading, isError, refetch } = useBot(botId)

  if (isLoading) return <LoadingSkeleton variant="form" />
  if (isError || !bot) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="space-y-6">
      <h2 className="text-[var(--font-size-section-heading)] font-semibold text-foreground">
        Tính cách Assistant
      </h2>
      <BotPersonalityForm bot={bot} />
    </div>
  )
}
