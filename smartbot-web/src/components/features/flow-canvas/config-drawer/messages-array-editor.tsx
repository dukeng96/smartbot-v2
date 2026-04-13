"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VariablePicker } from "./variable-picker"
import type { MessageEntry } from "@/lib/types/flow"

interface MessagesArrayEditorProps {
  value: MessageEntry[]
  onChange: (value: MessageEntry[]) => void
}

const ROLE_OPTIONS: Array<{ label: string; value: MessageEntry["role"] }> = [
  { label: "System", value: "system" },
  { label: "User", value: "user" },
  { label: "Assistant", value: "assistant" },
]

export function MessagesArrayEditor({ value, onChange }: MessagesArrayEditorProps) {
  function addRow() {
    onChange([...value, { role: "user", content: "" }])
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function updateRole(index: number, role: MessageEntry["role"]) {
    onChange(value.map((row, i) => (i === index ? { ...row, role } : row)))
  }

  function updateContent(index: number, content: string) {
    onChange(value.map((row, i) => (i === index ? { ...row, content } : row)))
  }

  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="border rounded-md p-2 space-y-1 bg-muted/30">
          <div className="flex items-center gap-2">
            <Select value={row.role} onValueChange={(v) => updateRole(i, v as MessageEntry["role"])}>
              <SelectTrigger className="h-7 text-[12px] w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-[12px]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              onClick={() => removeRow(i)}
            >
              <Trash2 size={12} />
            </Button>
          </div>
          <VariablePicker
            value={row.content}
            onChange={(v) => updateContent(i, v)}
            placeholder="Nội dung tin nhắn…"
            rows={3}
          />
        </div>
      ))}

      <Button variant="outline" size="sm" className="w-full h-7 text-[12px]" onClick={addRow}>
        <Plus size={12} className="mr-1" />
        Thêm tin nhắn
      </Button>
    </div>
  )
}
