"use client"

import { useParams } from "next/navigation"
import { toast } from "sonner"

import { useBotChannels } from "@/lib/hooks/use-bots"
import { useCreateChannel, useDeleteChannel } from "@/lib/hooks/use-bot-integrations"
import type { Channel, ChannelType } from "@/lib/types/channel"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { ErrorState } from "@/components/shared/error-state"
import { BotChannelList } from "@/components/features/bots/bot-channel-list"

/**
 * C7 — Channel connections tab.
 */
export default function BotChannelsPage() {
  const { botId } = useParams<{ botId: string }>()
  const { data: channels, isLoading, isError, refetch } = useBotChannels(botId)
  const createChannel = useCreateChannel(botId)
  const deleteChannel = useDeleteChannel(botId)

  const handleConnect = (type: ChannelType) => {
    createChannel.mutate({ type })
  }

  const handleDisconnect = (channel: Channel) => {
    if (confirm(`Ngắt kết nối ${channel.type}?`)) {
      deleteChannel.mutate(channel.id)
    }
  }

  if (isLoading) return <LoadingSkeleton variant="cards" rows={4} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div className="space-y-6">
      <h2 className="text-[var(--font-size-section-heading)] font-semibold text-foreground">
        Kênh kết nối
      </h2>
      <BotChannelList
        botId={botId}
        channels={channels ?? []}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />
    </div>
  )
}
