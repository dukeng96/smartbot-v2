"use client"

import { useRef, useEffect } from "react"

import type { Conversation } from "@/lib/types/conversation"
import type { Message } from "@/lib/types/message"
import { CHANNEL_LABELS, STATUS_LABELS } from "@/lib/types/conversation"
import { formatRelativeTime } from "@/lib/utils/format-date"
import { StatusBadge } from "@/components/shared/status-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ChatMessageBubble } from "./chat-message-bubble"

interface ChatThreadProps {
  conversation: Conversation
  messages: Message[]
  onFeedback: (vars: {
    msgId: string
    convId: string
    feedback: "thumbs_up" | "thumbs_down"
  }) => void
}

/** Map conversation status to StatusBadge variant */
function statusVariant(s: string) {
  if (s === "active") return "active" as const
  if (s === "closed") return "completed" as const
  return "draft" as const
}

/**
 * Scrollable chat thread with header.
 * Read-only operational view — not a consumer chat interface.
 */
export function ChatThread({
  conversation,
  messages,
  onFeedback,
}: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card">
      {/* Thread header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <Avatar className="size-9">
          <AvatarFallback className="text-[12px] bg-muted">
            {(conversation.endUserName ?? "U")[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[14px] text-foreground truncate">
              {conversation.endUserName ?? "Ẩn danh"}
            </span>
            <StatusBadge
              status={statusVariant(conversation.channel === "web_widget" ? "active" : "processing") as "active"}
              label={CHANNEL_LABELS[conversation.channel]}
            />
            <StatusBadge
              status={statusVariant(conversation.status)}
              label={STATUS_LABELS[conversation.status]}
            />
          </div>
          <p className="text-[12px] text-text-muted mt-0.5">
            Bắt đầu {formatRelativeTime(conversation.createdAt)} &bull;{" "}
            {conversation.messageCount} tin nhắn
          </p>
        </div>
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-4"
        style={{ minHeight: 0 }}
      >
        {messages.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            message={msg}
            convId={conversation.id}
            onFeedback={onFeedback}
          />
        ))}
      </div>
    </div>
  )
}
