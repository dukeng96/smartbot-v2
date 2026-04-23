import type { BotWidgetConfig } from "@/lib/types/bot"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"

/**
 * Public bot config returned by GET /api/v1/chat/:botId/config.
 * No auth required — used by the direct link chat page.
 */
export interface PublicBotConfig {
  id: string
  name: string
  avatarUrl: string | null
  greetingMessage: string | null
  suggestedQuestions: string[]
  widgetConfig: BotWidgetConfig | null
}

/** Message shape for chat history */
export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  createdAt: string
}

/** Fetch public bot config (no auth) */
export async function fetchBotConfig(botId: string): Promise<PublicBotConfig> {
  const res = await fetch(`${API_URL}/api/v1/chat/${botId}/config`)
  if (!res.ok) {
    throw new Error(`Failed to load bot config: ${res.status}`)
  }
  const json = await res.json()
  return json.data ?? json
}

/** Load conversation history for returning user (no auth) */
export async function fetchChatHistory(
  botId: string,
  conversationId: string,
  endUserId: string,
): Promise<ChatMessage[]> {
  const res = await fetch(
    `${API_URL}/api/v1/chat/${botId}/conversations/${conversationId}/messages`,
    { headers: { "x-end-user-id": endUserId } },
  )
  if (!res.ok) {
    throw new Error(`Failed to load chat history: ${res.status}`)
  }
  const json = await res.json()
  // Backend may return { data: messages[] } or messages[] directly
  return json.data ?? json
}

/** SSE event types from backend */
export interface SseConversationEvent {
  conversationId: string
}

export interface SseDeltaEvent {
  content: string
}

export interface SseDoneEvent {
  conversationId: string
  responseTimeMs: number
  creditsUsed: number
}

export interface SseErrorEvent {
  error: string
}

export interface SseRetrievalChunk {
  ref_index: number
  content: string
  document_name?: string
  breadcrumb?: string
}

export interface SseRetrievalEvent {
  chunks: SseRetrievalChunk[]
}

export interface ChatStreamCallbacks {
  onConversation: (data: SseConversationEvent) => void
  onDelta: (data: SseDeltaEvent) => void
  onRetrieval?: (data: SseRetrievalEvent) => void
  onDone: (data: SseDoneEvent) => void
  onError: (error: string) => void
}

/**
 * POST-based SSE streaming chat.
 * Returns AbortController for cancellation.
 */
export function streamChatMessage(
  botId: string,
  payload: {
    message: string
    conversationId?: string
    endUserId?: string
    endUserName?: string
  },
  callbacks: ChatStreamCallbacks,
): AbortController {
  const controller = new AbortController()

  const run = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/chat/${botId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!res.ok) {
        callbacks.onError(`Server error: ${res.status}`)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        callbacks.onError("No response stream available")
        return
      }

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE events from buffer: "event: <type>\ndata: <json>\n\n"
        const events = buffer.split("\n\n")
        // Keep last incomplete chunk in buffer. If stream closes before final
        // \n\n, the incomplete event is discarded (SSE spec-compliant behavior).
        buffer = events.pop() ?? ""

        for (const raw of events) {
          if (!raw.trim()) continue

          let eventType = ""
          let eventData = ""

          for (const line of raw.split("\n")) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim()
            } else if (line.startsWith("data: ")) {
              eventData = line.slice(6)
            }
          }

          if (!eventType || !eventData) continue

          try {
            const parsed = JSON.parse(eventData)
            switch (eventType) {
              case "conversation":
                callbacks.onConversation(parsed)
                break
              case "delta":
                callbacks.onDelta(parsed)
                break
              case "retrieval":
                callbacks.onRetrieval?.(parsed)
                break
              case "done":
                callbacks.onDone(parsed)
                break
              case "error":
                callbacks.onError(parsed.error ?? "Unknown error")
                break
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        callbacks.onError((err as Error).message ?? "Network error")
      }
    }
  }

  run()
  return controller
}
