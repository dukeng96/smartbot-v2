"use client"

import { Bot } from "lucide-react"

interface BotChatPreviewProps {
  botName: string
  greeting: string
  suggestedQuestions: string[]
}

/**
 * Chat preview card — shows greeting + suggested question chips + sample exchange.
 * Used as the right column in the C3 Personality tab.
 */
export function BotChatPreview({ botName, greeting, suggestedQuestions }: BotChatPreviewProps) {
  return (
    <div className="sticky top-6 rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary">
          <Bot className="size-4 text-white" />
        </div>
        <span className="text-[13px] font-semibold text-foreground">{botName || "Assistant"}</span>
      </div>

      {/* Chat body */}
      <div className="space-y-4 p-4" style={{ minHeight: 320 }}>
        {/* Bot greeting */}
        {greeting && (
          <div className="flex gap-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="size-3 text-primary" />
            </div>
            <div className="max-w-[80%] rounded-xl rounded-tl-sm bg-muted px-3 py-2 text-[13px] text-foreground">
              {greeting}
            </div>
          </div>
        )}

        {/* Suggested question chips */}
        {suggestedQuestions.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-8">
            {suggestedQuestions.slice(0, 4).map((q, i) => (
              <span
                key={i}
                className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[12px] text-primary"
              >
                {q}
              </span>
            ))}
          </div>
        )}

        {/* Sample user message */}
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-xl rounded-tr-sm bg-primary px-3 py-2 text-[13px] text-white">
            Xin chào!
          </div>
        </div>

        {/* Sample bot reply */}
        <div className="flex gap-2">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Bot className="size-3 text-primary" />
          </div>
          <div className="max-w-[80%] rounded-xl rounded-tl-sm bg-muted px-3 py-2 text-[13px] text-foreground">
            {greeting || "Xin chào! Tôi có thể giúp gì cho bạn?"}
          </div>
        </div>
      </div>

      {/* Input area (decorative) */}
      <div className="border-t border-border px-4 py-3">
        <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-[13px] text-text-muted">
          Nhập tin nhắn...
        </div>
      </div>
    </div>
  )
}
