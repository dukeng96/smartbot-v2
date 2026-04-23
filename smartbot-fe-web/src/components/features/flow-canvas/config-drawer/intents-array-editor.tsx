"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Intent } from "@/lib/types/flow"

interface IntentsArrayEditorProps {
  value: Intent[]
  onChange: (value: Intent[]) => void
}

export function IntentsArrayEditor({ value, onChange }: IntentsArrayEditorProps) {
  function addIntent() {
    onChange([...value, { description: "" }])
  }

  function removeIntent(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function updateDescription(index: number, description: string) {
    onChange(value.map((intent, i) => (i === index ? { ...intent, description } : intent)))
  }

  return (
    <div className="space-y-2">
      {value.map((intent, i) => (
        <div key={i} className="border rounded-md p-2 space-y-1 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              Intent {i}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              onClick={() => removeIntent(i)}
            >
              <Trash2 size={12} />
            </Button>
          </div>
          <Textarea
            value={intent.description}
            onChange={(e) => updateDescription(i, e.target.value)}
            placeholder="Mô tả intent (VD: Người dùng muốn mua sản phẩm)"
            className="min-h-[60px] text-[13px] resize-none"
          />
        </div>
      ))}

      <Button variant="outline" size="sm" className="w-full h-7 text-[12px]" onClick={addIntent}>
        <Plus size={12} className="mr-1" />
        Thêm intent
      </Button>
    </div>
  )
}
