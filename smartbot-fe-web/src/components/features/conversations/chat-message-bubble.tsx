"use client"

import type { Message } from "@/lib/types/message"
import { formatRelativeTime } from "@/lib/utils/format-date"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ChatMessageFeedback } from "./chat-message-feedback"
import { ChatRagDebugPanel } from "./chat-rag-debug-panel"
import { CitationRenderer } from "@/components/ui/citation-renderer"
import type { CitationChunk } from "@/lib/hooks/use-citation-parser"

interface ChatMessageBubbleProps {
  message: Message
  convId: string
  onFeedback: (vars: {
    msgId: string
    convId: string
    feedback: "thumbs_up" | "thumbs_down"
  }) => void
}

/**
 * Single chat message bubble.
 * Assistant: left-aligned, white bg, 1px border.
 * User: right-aligned, #EDE9FE bg.
 */
export function ChatMessageBubble({
  message,
  convId,
  onFeedback,
}: ChatMessageBubbleProps) {
  const isAssistant = message.role === "assistant"
  const isUser = message.role === "user"

  // Convert retrievalContext to CitationChunk format
  const citationChunks: CitationChunk[] = (message.retrievalContext || []).map(
    (ctx, i) => ({
      refIndex: i,
      content: ctx.content,
      documentName: ctx.documentName,
    })
  )
  const hasCitations = citationChunks.length > 0

  if (message.role === "system") return null

  return (
    <div
      className={cn(
        "flex gap-2.5 max-w-[75%]",
        isUser && "ml-auto flex-row-reverse",
      )}
    >
      <Avatar className="size-8 shrink-0 mt-1">
        <AvatarFallback
          className={cn(
            "text-[11px]",
            isAssistant ? "bg-primary/10 text-primary" : "bg-muted",
          )}
        >
          {isAssistant ? "AI" : "U"}
        </AvatarFallback>
      </Avatar>

      <div className={cn("min-w-0", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-xl px-4 py-2.5 text-[13px] leading-relaxed",
            isAssistant
              ? "bg-white border border-border text-text-body"
              : "bg-[#EDE9FE] text-text-body",
          )}
        >
          {isAssistant && hasCitations ? (
            <CitationRenderer
              content={message.content}
              chunks={citationChunks}
              isStreaming={false}
              className="whitespace-pre-wrap break-words"
            />
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>

        <p
          className={cn(
            "mt-1 text-[11px] text-text-muted",
            isUser && "text-right",
          )}
        >
          {formatRelativeTime(message.createdAt)}
        </p>

        {isAssistant && (
          <>
            <ChatMessageFeedback
              messageId={message.id}
              convId={convId}
              currentFeedback={message.feedback}
              onFeedback={onFeedback}
            />
            <ChatRagDebugPanel message={message} />
          </>
        )}
      </div>
    </div>
  )
}
