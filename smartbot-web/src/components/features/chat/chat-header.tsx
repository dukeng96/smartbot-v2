"use client"

import type { PublicBotConfig } from "@/lib/api/chat-api"

interface ChatHeaderProps {
  config: PublicBotConfig
}

/** Colored header bar with bot name + avatar + online indicator */
export function ChatHeader({ config }: ChatHeaderProps) {
  const primaryColor = config.widgetConfig?.primaryColor ?? "#6D28D9"
  const displayName =
    config.widgetConfig?.displayName ?? config.name ?? "Assistant"
  const logoUrl = config.widgetConfig?.logoUrl ?? config.avatarUrl

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 text-white shadow-sm"
      style={{ backgroundColor: primaryColor }}
    >
      {/* Bot avatar */}
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={displayName}
          className="size-9 rounded-full bg-white/20 object-cover"
        />
      ) : (
        <div className="flex size-9 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold">{displayName}</h1>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-green-400" />
          <span className="text-xs text-white/80">Trực tuyến</span>
        </div>
      </div>
    </div>
  )
}
