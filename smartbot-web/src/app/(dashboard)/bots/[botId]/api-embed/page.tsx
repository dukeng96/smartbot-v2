"use client"

import { useParams } from "next/navigation"

import { useBot, useBotEmbedCode } from "@/lib/hooks/use-bots"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { ErrorState } from "@/components/shared/error-state"
import { BotApiKeySection } from "@/components/features/bots/bot-api-key-section"
import { BotEmbedCodeSection } from "@/components/features/bots/bot-embed-code-section"

/**
 * C5 — API key + embed code tab.
 */
export default function BotApiEmbedPage() {
  const { botId } = useParams<{ botId: string }>()
  const { data: bot, isLoading: botLoading, isError: botError, refetch } = useBot(botId)
  const { data: embedCode, isLoading: embedLoading } = useBotEmbedCode(botId)

  if (botLoading) return <LoadingSkeleton variant="detail" />
  if (botError || !bot) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="space-y-8">
      <h2 className="text-[var(--font-size-section-heading)] font-semibold text-foreground">
        API & Embed
      </h2>
      <BotApiKeySection bot={bot} />
      <BotEmbedCodeSection embedCode={embedCode} isLoading={embedLoading} />
    </div>
  )
}
