"use client"

import { cn } from "@/lib/utils"
import type { BotWidgetConfig } from "@/lib/types/bot"

interface ChatMessageBubbleProps {
  role: "user" | "assistant"
  content: string
  isStreaming?: boolean
  widgetConfig: BotWidgetConfig | null
}

/** Individual chat bubble — user (right) or assistant (left) */
export function ChatMessageBubble({
  role,
  content,
  isStreaming,
  widgetConfig,
}: ChatMessageBubbleProps) {
  const isUser = role === "user"
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
        {/* Plain text rendering — prevents XSS from LLM-generated content.
            If Markdown needed in future, use react-markdown + DOMPurify. */}
        <div className="whitespace-pre-wrap break-words">
          {content}
          {isStreaming && (
            <span className="ml-0.5 inline-block animate-pulse">▊</span>
          )}
        </div>
      </div>
    </div>
  )
}
