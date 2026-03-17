"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { Globe, MessageCircle, Send, MessageSquare, Code, Wifi, WifiOff } from "lucide-react"

import type { Channel, ChannelType } from "@/lib/types/channel"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"

const CHANNEL_META: Record<ChannelType, { label: string; icon: React.ElementType; description: string }> = {
  web_widget: { label: "Web Widget", icon: Globe, description: "Chat widget nhúng trên website" },
  facebook_messenger: { label: "Facebook Messenger", icon: MessageCircle, description: "Kết nối với Facebook Page" },
  telegram: { label: "Telegram", icon: Send, description: "Kết nối với Telegram Bot" },
  zalo: { label: "Zalo", icon: MessageSquare, description: "Kết nối với Zalo OA" },
  api: { label: "API", icon: Code, description: "Tích hợp qua REST API" },
}

const ALL_CHANNEL_TYPES: ChannelType[] = ["web_widget", "facebook_messenger", "telegram", "zalo", "api"]

interface BotChannelListProps {
  botId: string
  channels: Channel[]
  onConnect: (type: ChannelType) => void
  onDisconnect: (channel: Channel) => void
}

export function BotChannelList({ botId, channels, onConnect, onDisconnect }: BotChannelListProps) {
  const channelMap = new Map(channels.map((ch) => [ch.type, ch]))

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {ALL_CHANNEL_TYPES.map((type) => {
        const meta = CHANNEL_META[type]
        const channel = channelMap.get(type)
        const isConnected = !!channel && channel.status === "active"
        const Icon = meta.icon

        return (
          <div key={type} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="size-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-[14px] font-semibold text-foreground">{meta.label}</h4>
                  {channel && <StatusBadge status={channel.status} />}
                </div>
                <p className="mt-0.5 text-[12px] text-text-secondary">{meta.description}</p>
              </div>
            </div>

            {/* Connection info */}
            {channel && (
              <div className="mt-3 space-y-1 text-[12px] text-text-muted">
                {channel.connectedAt && (
                  <p>Kết nối: {formatDistanceToNow(new Date(channel.connectedAt), { addSuffix: true, locale: vi })}</p>
                )}
                {channel.lastActiveAt && (
                  <p>Hoạt động: {formatDistanceToNow(new Date(channel.lastActiveAt), { addSuffix: true, locale: vi })}</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-4">
              {type === "web_widget" && isConnected ? (
                <Link href={`/bots/${botId}/widget`}>
                  <Button variant="outline" size="sm" className="w-full">
                    Đi tới cài đặt Widget
                  </Button>
                </Link>
              ) : type === "api" && isConnected ? (
                <Link href={`/bots/${botId}/api-embed`}>
                  <Button variant="outline" size="sm" className="w-full">
                    Quản lý API Key
                  </Button>
                </Link>
              ) : isConnected ? (
                <Button variant="destructive" size="sm" className="w-full" onClick={() => onDisconnect(channel!)}>
                  <WifiOff className="mr-1.5 size-3.5" /> Ngắt kết nối
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="w-full" onClick={() => onConnect(type)}>
                  <Wifi className="mr-1.5 size-3.5" /> Kết nối
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
