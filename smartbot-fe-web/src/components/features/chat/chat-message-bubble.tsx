"use client"

import { cn } from "@/lib/utils"
import type { BotWidgetConfig } from "@/lib/types/bot"
import { CitationRenderer } from "@/components/ui/citation-renderer"
import type { RetrievalChunkLocal } from "@/lib/hooks/use-chat-stream"

interface ChatMessageBubbleProps {
  role: "user" | "assistant"
  content: string
  isStreaming?: boolean
  widgetConfig: BotWidgetConfig | null
  retrievalChunks?: RetrievalChunkLocal[]
}

/** Individual chat bubble — user (right) or assistant (left) */
export function ChatMessageBubble({
  role,
  content,
  isStreaming,
  widgetConfig,
  retrievalChunks,
}: ChatMessageBubbleProps) {
  const isUser = role === "user"
  const hasCitations = retrievalChunks && retrievalChunks.length > 0
  const primaryColor = widgetConfig?.primaryColor ?? "#6D28D9"
  const fontColor = widgetConfig?.fontColor ?? undefined
  const userBubbleColor = widgetConfig?.userMessageColor ?? "#EDE9FE"
  const botBubbleColor = widgetConfig?.botMessageColor ?? "#F3F4F6"
  const fontFamily = widgetConfig?.fontFamily ?? undefined
  const fontSize = widgetConfig?.fontSize === "small"
    ? "12px"
    : widgetConfig?.fontSize === "large"
      ? "16px"
      : "14px"

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser ? "rounded-br-md" : "rounded-bl-md",
        )}
        style={{
          backgroundColor: isUser ? userBubbleColor : botBubbleColor,
          color: isUser ? (userBubbleColor === "#EDE9FE" ? primaryColor : fontColor) : fontColor,
          fontFamily: fontFamily && fontFamily !== "system" ? fontFamily : undefined,
          fontSize,
        }}
      >
        {/* Citation-aware rendering for assistant messages with KB chunks */}
        <div className="whitespace-pre-wrap break-words">
          {!isUser && hasCitations ? (
            <CitationRenderer
              content={content}
              chunks={retrievalChunks}
              isStreaming={isStreaming}
            />
          ) : (
            <>
              {content}
              {isStreaming && (
                <span className="ml-0.5 inline-block animate-pulse">▊</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
