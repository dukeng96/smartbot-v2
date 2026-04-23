"use client"

import { useState, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Code, Terminal, Link2 } from "lucide-react"

import { useBot, useBotEmbedCode, useBotChannels } from "@/lib/hooks/use-bots"
import { useCreateChannel, useDeleteChannel } from "@/lib/hooks/use-bot-integrations"
import type { UpdateWidgetInput } from "@/lib/validations/bot-schemas"
import type { Channel, ChannelType } from "@/lib/types/channel"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { ErrorState } from "@/components/shared/error-state"
import { BotWidgetConfig } from "@/components/features/bots/bot-widget-config"
import { BotWidgetPreview } from "@/components/features/bots/bot-widget-preview"
import { BotApiKeySection } from "@/components/features/bots/bot-api-key-section"
import { BotEmbedCodeSection } from "@/components/features/bots/bot-embed-code-section"
import { BotChannelList } from "@/components/features/bots/bot-channel-list"
import { cn } from "@/lib/utils"

const SECTIONS = [
  { id: "widget", label: "Widget", icon: Code },
  { id: "api", label: "API & Embed", icon: Terminal },
  { id: "channels", label: "Kênh kết nối", icon: Link2 },
] as const

type SectionId = (typeof SECTIONS)[number]["id"]

/**
 * Integrations tab - Widget, API & Embed, Channels combined.
 */
export default function IntegrationsPage() {
  const { botId } = useParams<{ botId: string }>()
  const searchParams = useSearchParams()
  const activeSection = (searchParams.get("section") as SectionId) || "widget"

  const { data: bot, isLoading: botLoading, isError: botError, refetch } = useBot(botId)
  const { data: embedCode, isLoading: embedLoading } = useBotEmbedCode(botId)
  const { data: channels, isLoading: channelsLoading } = useBotChannels(botId)
  const createChannel = useCreateChannel(botId)
  const deleteChannel = useDeleteChannel(botId)

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

  const handleConnect = (type: ChannelType) => {
    createChannel.mutate({ type })
  }

  const handleDisconnect = (channel: Channel) => {
    if (confirm(`Ngắt kết nối ${channel.type}?`)) {
      deleteChannel.mutate(channel.id)
    }
  }

  if (botLoading) return <LoadingSkeleton variant="form" />
  if (botError || !bot) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="space-y-6">
      <h2 className="text-[var(--font-size-section-heading)] font-semibold text-foreground">
        Integrations
      </h2>

      <div className="flex gap-6">
        {/* Left nav */}
        <nav className="w-48 shrink-0 space-y-1">
          {SECTIONS.map((s) => (
            <Link
              key={s.id}
              href={`?section=${s.id}`}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors",
                activeSection === s.id
                  ? "bg-muted font-medium text-foreground"
                  : "text-text-muted hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <s.icon className="size-4" />
              {s.label}
            </Link>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeSection === "widget" && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[55fr_45fr]">
              <BotWidgetConfig bot={bot} onChange={handleConfigChange} />
              <div className="hidden lg:block">
                <BotWidgetPreview config={previewConfig} botName={bot.name} />
              </div>
            </div>
          )}

          {activeSection === "api" && (
            <div className="space-y-8">
              <BotApiKeySection bot={bot} />
              <BotEmbedCodeSection embedCode={embedCode} isLoading={embedLoading} />
            </div>
          )}

          {activeSection === "channels" && (
            channelsLoading ? (
              <LoadingSkeleton variant="cards" rows={4} />
            ) : (
              <BotChannelList
                botId={botId}
                channels={channels ?? []}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
            )
          )}
        </div>
      </div>
    </div>
  )
}
