"use client"

import { useEffect, useCallback } from "react"

import { useChatStream } from "@/lib/hooks/use-chat-stream"
import { ChatHeader } from "./chat-header"
import { ChatMessageList } from "./chat-message-list"
import { ChatInput } from "./chat-input"
import { ChatSuggestedQuestions } from "./chat-suggested-questions"

interface ChatContainerProps {
  botId: string
}

/**
 * Orchestrator for the direct-link chat page.
 * Manages bot config loading, message history, SSE streaming, and layout.
 */
export function ChatContainer({ botId }: ChatContainerProps) {
  const {
    config,
    messages,
    status,
    error,
    configLoading,
    initialize,
    sendMessage,
  } = useChatStream(botId)

  useEffect(() => {
    initialize()
  }, [initialize])

  const handleSuggestedQuestion = useCallback(
    (question: string) => sendMessage(question),
    [sendMessage],
  )

  const primaryColor = config?.widgetConfig?.primaryColor ?? "#6D28D9"
  const showPoweredBy = config?.widgetConfig?.showPoweredBy ?? true
  const fontFamily = config?.widgetConfig?.fontFamily
  const isStreaming = status === "streaming"

  const hasGreeting = !!config?.greetingMessage
  // Show suggestion chips only when conversation hasn't started
  const showSuggestions =
    messages.length === 0 &&
    config?.suggestedQuestions &&
    config.suggestedQuestions.length > 0

  // Loading state
  if (configLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div
            className="size-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: `${primaryColor} transparent ${primaryColor} ${primaryColor}` }}
          />
          <p className="text-sm text-text-muted">Đang tải...</p>
        </div>
      </div>
    )
  }

  // Error loading config
  if (!config) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-text-secondary">
            {error ?? "Không thể tải cấu hình bot"}
          </p>
          <button
            type="button"
            onClick={initialize}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex h-dvh flex-col"
      style={{ fontFamily: fontFamily && fontFamily !== "system" ? fontFamily : undefined }}
    >
      {/* Header */}
      <ChatHeader config={config} />

      {/* Messages area — greeting is always first, then conversation */}
      <ChatMessageList
        messages={messages}
        widgetConfig={config.widgetConfig}
        greetingMessage={hasGreeting ? config.greetingMessage! : undefined}
      >
        {showSuggestions && (
          <ChatSuggestedQuestions
            questions={config.suggestedQuestions}
            onSelect={handleSuggestedQuestion}
            primaryColor={primaryColor}
          />
        )}
      </ChatMessageList>

      {/* Powered by footer */}
      {showPoweredBy && (
        <div className="border-t border-border-light bg-white px-4 py-1.5 text-center">
          <span className="text-[11px] text-text-muted">Powered by Smartbot</span>
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        disabled={isStreaming}
        primaryColor={primaryColor}
      />
    </div>
  )
}
