"use client"

import { useState, useRef, useCallback } from "react"
import { useFlowStore } from "../hooks/use-flow-store"

interface VariablePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

export function VariablePicker({
  value,
  onChange,
  placeholder,
  rows = 2,
}: VariablePickerProps) {
  const nodes = useFlowStore((s) => s.nodes)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filter, setFilter] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Build suggestion list from node output anchors + state keys
  const suggestions = [
    "{{state.message}}",
    "{{state.intent}}",
    ...nodes.flatMap((n) =>
      n.data.outputAnchors.map((a) => `{{${n.id}.${a.name}}}`)
    ),
  ]

  const filtered = filter
    ? suggestions.filter((s) => s.toLowerCase().includes(filter.toLowerCase()))
    : suggestions

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "{" || (e.key === "{" && e.shiftKey)) {
        setFilter("")
        setShowSuggestions(true)
      } else if (e.key === "Escape") {
        setShowSuggestions(false)
      }
    },
    []
  )

  const insertSuggestion = useCallback(
    (suggestion: string) => {
      const ta = textareaRef.current
      if (!ta) return
      const start = ta.selectionStart ?? value.length
      // Find the opening {{ to replace partial input
      const before = value.slice(0, start)
      const braceIdx = before.lastIndexOf("{{")
      const prefix = braceIdx >= 0 ? value.slice(0, braceIdx) : before
      const suffix = value.slice(start)
      onChange(prefix + suggestion + suffix)
      setShowSuggestions(false)
    },
    [value, onChange]
  )

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    onChange(val)
    // Update filter based on content after last {{
    const cursor = e.target.selectionStart ?? val.length
    const partial = val.slice(0, cursor)
    const braceIdx = partial.lastIndexOf("{{")
    if (braceIdx >= 0 && !partial.includes("}}", braceIdx)) {
      setFilter(partial.slice(braceIdx + 2))
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Nhập giá trị hoặc {{state.var}}"}
        className="w-full text-[13px] rounded-md border bg-background px-3 py-2 resize-none font-mono focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute z-50 w-full bg-popover border rounded-md shadow-md mt-1 max-h-40 overflow-y-auto">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              className="w-full text-left px-3 py-1.5 text-[12px] font-mono hover:bg-accent"
              onMouseDown={(e) => {
                e.preventDefault()
                insertSuggestion(s)
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
