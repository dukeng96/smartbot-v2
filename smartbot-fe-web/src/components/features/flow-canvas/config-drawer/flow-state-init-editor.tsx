"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { StateUpdate } from "@/lib/types/flow"

interface FlowStateInitEditorProps {
  value: StateUpdate[]
  onChange: (value: StateUpdate[]) => void
}

export function FlowStateInitEditor({ value, onChange }: FlowStateInitEditorProps) {
  function addRow() {
    onChange([...value, { key: "", value: "" }])
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function updateKey(index: number, key: string) {
    onChange(value.map((row, i) => (i === index ? { ...row, key } : row)))
  }

  function updateValue(index: number, val: string) {
    onChange(value.map((row, i) => (i === index ? { ...row, value: val } : row)))
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        Khai báo biến mặc định cho flow state. Giá trị sẽ bị ghi đè nếu caller cung cấp.
      </p>
      {value.map((row, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1 items-center">
          <Input
            value={row.key}
            onChange={(e) => updateKey(i, e.target.value)}
            placeholder="tên_biến"
            className="h-7 text-[12px] font-mono"
          />
          <Input
            value={row.value}
            onChange={(e) => updateValue(i, e.target.value)}
            placeholder="giá trị mặc định"
            className="h-7 text-[12px]"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={() => removeRow(i)}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full h-7 text-[12px]" onClick={addRow}>
        <Plus size={12} className="mr-1" />
        Thêm biến
      </Button>
    </div>
  )
}
