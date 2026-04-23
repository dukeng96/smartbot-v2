"use client"

import { useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import { cn } from "@/lib/utils"
import type { TestMessage } from "../hooks/use-test-run"
import { CitationRenderer } from "@/components/ui/citation-renderer"

interface TestMessageListProps {
  messages: TestMessage[]
  className?: string
}

export function TestMessageList({ messages, className }: TestMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-[12px] text-muted-foreground", className)}>
        Gửi tin nhắn để kiểm thử flow
      </div>
    )
  }

  return (
    <div className={cn("px-4 py-3 space-y-3", className)}>
      {messages.map((msg, i) => (
        <div
          key={i}
          className={cn(
            "flex",
            msg.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          <div
            className={cn(
              "max-w-[80%] rounded-lg px-3 py-2 text-[13px]",
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            )}
          >
            {msg.role === "user" ? (
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {msg.content}
              </p>
            ) : msg.retrievalChunks && msg.retrievalChunks.length > 0 ? (
              <div className="whitespace-pre-wrap break-words leading-relaxed">
                <CitationRenderer
                  content={msg.content}
                  chunks={msg.retrievalChunks}
                  isStreaming={msg.streaming}
                />
              </div>
            ) : (
              <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none break-words leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
                {msg.streaming && (
                  <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
