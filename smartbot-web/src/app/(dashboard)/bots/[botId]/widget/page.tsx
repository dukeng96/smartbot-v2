"use client"

import { useState, useCallback } from "react"
import { useParams } from "next/navigation"

import { useBot } from "@/lib/hooks/use-bots"
import type { UpdateWidgetInput } from "@/lib/validations/bot-schemas"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { ErrorState } from "@/components/shared/error-state"
import { BotWidgetConfig } from "@/components/features/bots/bot-widget-config"
import { BotWidgetPreview } from "@/components/features/bots/bot-widget-preview"

/**
 * C4 — Widget config + preview tab.
 */
export default function BotWidgetPage() {
  const { botId } = useParams<{ botId: string }>()
  const { data: bot, isLoading, isError, refetch } = useBot(botId)

  const [previewConfig, setPreviewConfig] = useState<UpdateWidgetInput>({
    theme: "light",
    primaryColor: "#6D28D9",
    position: "bottom-right",
    showPoweredBy: true,
    headerText: "",
  })

  const handleConfigChange = useCallback((values: UpdateWidgetInput) => {
    setPreviewConfig(values)
  }, [])

  if (isLoading) return <LoadingSkeleton variant="form" />
  if (isError || !bot) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="space-y-6">
      <h2 className="text-[var(--font-size-section-heading)] font-semibold text-foreground">
        Cấu hình Widget
      </h2>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[55fr_45fr]">
        <BotWidgetConfig bot={bot} onChange={handleConfigChange} />
        <div className="hidden lg:block">
          <BotWidgetPreview config={previewConfig} botName={bot.name} />
        </div>
      </div>
    </div>
  )
}
