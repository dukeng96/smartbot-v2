"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import type { TestMessage } from "../hooks/use-test-run"

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
            <p className="whitespace-pre-wrap break-words leading-relaxed">
              {msg.content}
              {msg.streaming && (
                <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse align-middle" />
              )}
            </p>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
