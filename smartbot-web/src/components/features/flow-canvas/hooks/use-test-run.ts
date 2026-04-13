"use client"

import { useState, useCallback, useRef } from "react"
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
  const nodeStartTimesRef = useRef<Record<string, number>>({})

  const sendMessage = useCallback(
    async (botId: string, content: string) => {
      if (isRunning) return

      setMessages((prev) => [...prev, { role: "user", content }])
      setIsRunning(true)
      setTraceMap({})
      nodeStartTimesRef.current = {}

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", streaming: true },
      ])

      abortRef.current = new AbortController()

      try {
        const token = getAccessToken()
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/chat/${botId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ message: content }),
            signal: abortRef.current.signal,
          }
        )

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        outer: while (true) {
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

              if (event.type === "token") {
                setMessages((prev) => {
                  const copy = [...prev]
                  const last = copy[copy.length - 1]
                  if (last?.role === "assistant") {
                    copy[copy.length - 1] = {
                      ...last,
                      content: last.content + event.data.content,
                    }
                  }
                  return copy
                })
              } else if (event.type === "node_start") {
                const nodeId = event.node_id
                nodeStartTimesRef.current[nodeId] = Date.now()
                setTraceMap((prev) => ({
                  ...prev,
                  [nodeId]: { nodeId, running: true },
                }))
              } else if (event.type === "node_end") {
                const nodeId = event.node_id
                const startedAt = nodeStartTimesRef.current[nodeId]
                const duration = startedAt ? Date.now() - startedAt : undefined
                setTraceMap((prev) => ({
                  ...prev,
                  [nodeId]: {
                    ...(prev[nodeId] ?? { nodeId, running: false }),
                    running: false,
                    duration,
                  },
                }))
              } else if (event.type === "node_error") {
                const nodeId = event.node_id
                setTraceMap((prev) => ({
                  ...prev,
                  [nodeId]: {
                    ...(prev[nodeId] ?? { nodeId, running: false }),
                    running: false,
                    error: "Lỗi node",
                  },
                }))
              } else if (event.type === "awaiting_input") {
                const nodeId = event.node_id
                setTraceMap((prev) => ({
                  ...prev,
                  [nodeId]: {
                    ...(prev[nodeId] ?? { nodeId, running: false }),
                    running: true,
                    awaitingInput: true,
                  },
                }))
                // TODO(Phase 09): surface approval UI; resume via
                // POST /api/v1/flows/executions/:id/resume
              } else if (event.type === "error") {
                setMessages((prev) => {
                  const copy = [...prev]
                  const last = copy[copy.length - 1]
                  if (last?.role === "assistant") {
                    copy[copy.length - 1] = {
                      ...last,
                      content: last.content || event.message,
                      streaming: false,
                    }
                  }
                  return copy
                })
              } else if (event.type === "done") {
                break outer
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
