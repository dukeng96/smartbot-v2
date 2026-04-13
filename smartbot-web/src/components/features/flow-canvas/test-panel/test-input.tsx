"use client"

import { useState, useRef } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TestInputProps {
  onSend: (content: string) => void
  disabled?: boolean
}

export function TestInput({ onSend, disabled }: TestInputProps) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue("")
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="px-3 py-2 border-t flex items-end gap-2">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Nhập tin nhắn… (Enter để gửi)"
        className="flex-1 resize-none text-[13px] rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 max-h-24 overflow-y-auto"
        style={{ height: "auto", minHeight: "36px" }}
        onInput={(e) => {
          const ta = e.currentTarget
          ta.style.height = "auto"
          ta.style.height = `${Math.min(ta.scrollHeight, 96)}px`
        }}
      />
      <Button
        size="sm"
        className="h-9 w-9 p-0 shrink-0"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
      >
        <Send size={14} />
      </Button>
    </div>
  )
}
