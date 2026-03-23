"use client"

import { useParams } from "next/navigation"

import { ChatContainer } from "@/components/features/chat/chat-container"

/**
 * Direct-link chat page — /chat/[botId]
 * Public route, no auth required.
 * Renders full-viewport chat UI styled by bot's widgetConfig.
 */
export default function ChatPage() {
  const params = useParams<{ botId: string }>()

  if (!params.botId) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="text-sm text-text-secondary">Bot ID không hợp lệ</p>
      </div>
    )
  }

  return <ChatContainer botId={params.botId} />
}
