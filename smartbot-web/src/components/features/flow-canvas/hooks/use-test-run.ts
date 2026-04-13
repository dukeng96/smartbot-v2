"use client"

import { useState, useCallback, useRef } from "react"
import { useFlowStore } from "./use-flow-store"
import type { NodeTrace, SseEvent } from "@/lib/types/flow"
import { getAccessToken } from "@/lib/api/client"

export interface TestMessage {
  role: "user" | "assistant"
  content: string
  streaming?: boolean
}

interface UseTestRunReturn {
  messages: TestMessage[]
  traceMap: Record<string, NodeTrace>
  isRunning: boolean
  sendMessage: (botId: string, content: string) => void
  clearMessages: () => void
}

export function useTestRun(): UseTestRunReturn {
  const [messages, setMessages] = useState<TestMessage[]>([])
  const [traceMap, setTraceMap] = useState<Record<string, NodeTrace>>({})
  const [isRunning, setIsRunning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (botId: string, content: string) => {
      if (isRunning) return

      setMessages((prev) => [...prev, { role: "user", content }])
      setIsRunning(true)
      setTraceMap({})

      // Append empty assistant message for streaming
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", streaming: true },
      ])

      abortRef.current = new AbortController()

      try {
        const token = getAccessToken()
        // TODO(Phase 07): Switch to backend flow-test proxy endpoint once dev-backend Phase 07 ships.
        // Endpoint will be: POST /api/v1/flows/:flowId/test with SSE response.
        // Until then, this hits the public chat endpoint which won't return node_start/node_end traces.
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/chat/${botId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ content }),
            signal: abortRef.current.signal,
          }
        )

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            const raw = line.slice(6).trim()
            if (!raw || raw === "[DONE]") continue

            try {
              const event = JSON.parse(raw) as SseEvent

              if (event.type === "chunk") {
                setMessages((prev) => {
                  const copy = [...prev]
                  const last = copy[copy.length - 1]
                  if (last?.role === "assistant") {
                    copy[copy.length - 1] = {
                      ...last,
                      content: last.content + event.content,
                    }
                  }
                  return copy
                })
              } else if (event.type === "node_start") {
                setTraceMap((prev) => ({
                  ...prev,
                  [event.nodeId]: { nodeId: event.nodeId, running: true },
                }))
              } else if (event.type === "node_end") {
                setTraceMap((prev) => ({
                  ...prev,
                  [event.nodeId]: {
                    nodeId: event.nodeId,
                    running: false,
                    duration: event.duration,
                    tokens: event.tokens,
                    error: event.error,
                  },
                }))
              } else if (event.type === "done") {
                break
              }
            } catch {
              // Malformed SSE line — skip
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) => {
            const copy = [...prev]
            const last = copy[copy.length - 1]
            if (last?.role === "assistant") {
              copy[copy.length - 1] = {
                ...last,
                content: last.content || "Lỗi kết nối. Vui lòng thử lại.",
                streaming: false,
              }
            }
            return copy
          })
        }
      } finally {
        // Mark streaming done
        setMessages((prev) => {
          const copy = [...prev]
          const last = copy[copy.length - 1]
          if (last?.role === "assistant") {
            copy[copy.length - 1] = { ...last, streaming: false }
          }
          return copy
        })
        setIsRunning(false)
      }
    },
    [isRunning]
  )

  const clearMessages = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setTraceMap({})
    setIsRunning(false)
  }, [])

  return { messages, traceMap, isRunning, sendMessage, clearMessages }
}
