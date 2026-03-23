"use client"

import { useState, useCallback, useRef } from "react"

import {
  fetchBotConfig,
  fetchChatHistory,
  streamChatMessage,
  type PublicBotConfig,
  type ChatMessage,
} from "@/lib/api/chat-api"

// localStorage keys
const END_USER_ID_KEY = "smartbot-end-user-id"
const CONV_KEY_PREFIX = "smartbot-conv-"

function getEndUserId(): string {
  if (typeof window === "undefined") return ""
  let id = localStorage.getItem(END_USER_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(END_USER_ID_KEY, id)
  }
  return id
}

function getStoredConversationId(botId: string): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(`${CONV_KEY_PREFIX}${botId}`)
}

function setStoredConversationId(botId: string, convId: string) {
  if (typeof window === "undefined") return
  localStorage.setItem(`${CONV_KEY_PREFIX}${botId}`, convId)
}

export type ChatStreamStatus = "idle" | "loading" | "streaming" | "error"

export interface ChatMessageLocal {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  isStreaming?: boolean
}

export function useChatStream(botId: string) {
  const [config, setConfig] = useState<PublicBotConfig | null>(null)
  const [messages, setMessages] = useState<ChatMessageLocal[]>([])
  const [status, setStatus] = useState<ChatStreamStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [configLoading, setConfigLoading] = useState(true)

  const conversationIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const endUserIdRef = useRef<string>("")

  /** Load bot config + restore conversation history */
  const initialize = useCallback(async () => {
    setConfigLoading(true)
    try {
      const botConfig = await fetchBotConfig(botId)
      setConfig(botConfig)

      endUserIdRef.current = getEndUserId()
      const storedConvId = getStoredConversationId(botId)

      if (storedConvId) {
        conversationIdRef.current = storedConvId
        try {
          const history = await fetchChatHistory(
            botId,
            storedConvId,
            endUserIdRef.current,
          )
          if (Array.isArray(history) && history.length > 0) {
            setMessages(
              history
                .filter((m: ChatMessage) => m.role !== "system")
                .map((m: ChatMessage) => ({
                  id: m.id,
                  role: m.role as "user" | "assistant",
                  content: m.content,
                  createdAt: m.createdAt,
                })),
            )
          }
        } catch {
          // History load failed — start fresh conversation
          conversationIdRef.current = null
        }
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setConfigLoading(false)
    }
  }, [botId])

  /** Send a message and stream the response */
  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || status === "streaming") return

      // Add user message immediately
      const userMsg: ChatMessageLocal = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
        createdAt: new Date().toISOString(),
      }

      // Add placeholder for assistant response
      const assistantMsg: ChatMessageLocal = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        isStreaming: true,
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setStatus("streaming")
      setError(null)

      const controller = streamChatMessage(
        botId,
        {
          message: content.trim(),
          conversationId: conversationIdRef.current ?? undefined,
          endUserId: endUserIdRef.current,
        },
        {
          onConversation: (data) => {
            conversationIdRef.current = data.conversationId
            setStoredConversationId(botId, data.conversationId)
          },
          onDelta: (data) => {
            setMessages((prev) => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last && last.role === "assistant" && last.isStreaming) {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + data.content,
                }
              }
              return updated
            })
          },
          onDone: () => {
            setMessages((prev) => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last && last.isStreaming) {
                updated[updated.length - 1] = { ...last, isStreaming: false }
              }
              return updated
            })
            setStatus("idle")
          },
          onError: (errMsg) => {
            setMessages((prev) => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last && last.isStreaming) {
                updated[updated.length - 1] = {
                  ...last,
                  content: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.",
                  isStreaming: false,
                }
              }
              return updated
            })
            setError(errMsg)
            setStatus("error")
          },
        },
      )

      abortRef.current = controller
    },
    [botId, status],
  )

  /** Cancel ongoing stream */
  const cancelStream = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setMessages((prev) => {
      const updated = [...prev]
      const last = updated[updated.length - 1]
      if (last && last.isStreaming) {
        updated[updated.length - 1] = { ...last, isStreaming: false }
      }
      return updated
    })
    setStatus("idle")
  }, [])

  return {
    config,
    messages,
    status,
    error,
    configLoading,
    initialize,
    sendMessage,
    cancelStream,
  }
}
