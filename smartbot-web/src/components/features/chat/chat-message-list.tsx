"use client"

import { useEffect, useRef, type ReactNode } from "react"

import type { ChatMessageLocal } from "@/lib/hooks/use-chat-stream"
import type { BotWidgetConfig } from "@/lib/types/bot"
import { ChatMessageBubble } from "./chat-message-bubble"

interface ChatMessageListProps {
  messages: ChatMessageLocal[]
  widgetConfig: BotWidgetConfig | null
  /** Bot greeting message — always shown as first bubble */
  greetingMessage?: string
  /** Slot for suggestion chips (shown after greeting, before messages) */
  children?: ReactNode
}

/** Scrollable message list with auto-scroll to bottom on new messages */
export function ChatMessageList({
  messages,
  widgetConfig,
  greetingMessage,
  children,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const bgColor = widgetConfig?.backgroundColor ?? "#FFFFFF"

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex flex-col gap-3">
        {/* Greeting message — always first */}
        {greetingMessage && (
          <ChatMessageBubble
            role="assistant"
            content={greetingMessage}
            widgetConfig={widgetConfig}
          />
        )}

        {/* Suggestion chips slot */}
        {children}

        {/* Conversation messages */}
        {messages.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            isStreaming={msg.isStreaming}
            widgetConfig={widgetConfig}
          />
        ))}
      </div>
      <div ref={bottomRef} role="status" aria-live="polite" aria-label="Tin nhắn mới nhất" />
    </div>
  )
}
