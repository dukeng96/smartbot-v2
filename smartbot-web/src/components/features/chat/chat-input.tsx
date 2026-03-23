"use client"

import { useRef, useCallback, type KeyboardEvent } from "react"
import { Send } from "lucide-react"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  primaryColor?: string
}

/** Chat input with textarea + send button. Disabled during streaming. */
export function ChatInput({ onSend, disabled, primaryColor = "#6D28D9" }: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const value = inputRef.current?.value.trim()
    if (!value || disabled) return
    onSend(value)
    if (inputRef.current) {
      inputRef.current.value = ""
      inputRef.current.style.height = "auto"
    }
  }, [onSend, disabled])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  /** Auto-resize textarea up to 120px */
  const handleInput = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [])

  return (
    <div className="border-t border-border bg-white px-3 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          placeholder="Nhập tin nhắn..."
          rows={1}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-body outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-ring disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: primaryColor }}
          aria-label="Gửi"
        >
          <Send className="size-4" />
        </button>
      </div>
      {disabled && (
        <p className="mt-1.5 text-xs text-text-muted">Đang trả lời...</p>
      )}
    </div>
  )
}
