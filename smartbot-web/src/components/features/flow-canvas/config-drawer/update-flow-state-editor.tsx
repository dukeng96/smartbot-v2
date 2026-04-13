"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { VariablePicker } from "./variable-picker"
import { useFlowStore } from "../hooks/use-flow-store"
import type { StateUpdate } from "@/lib/types/flow"

interface UpdateFlowStateEditorProps {
  nodeId: string
}

export function UpdateFlowStateEditor({ nodeId }: UpdateFlowStateEditorProps) {
  const node = useFlowStore((s) => s.nodes.find((n) => n.id === nodeId))
  const updateNodeStateWrites = useFlowStore((s) => s.updateNodeStateWrites)

  const rows: StateUpdate[] = node?.data.stateWrites ?? []

  function addRow() {
    updateNodeStateWrites(nodeId, [...rows, { key: "", value: "" }])
  }

  function removeRow(i: number) {
    updateNodeStateWrites(nodeId, rows.filter((_, idx) => idx !== i))
  }

  function updateKey(i: number, key: string) {
    updateNodeStateWrites(
      nodeId,
      rows.map((r, idx) => (idx === i ? { ...r, key } : r))
    )
  }

  function updateValue(i: number, value: string) {
    updateNodeStateWrites(
      nodeId,
      rows.map((r, idx) => (idx === i ? { ...r, value } : r))
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        Ghi giá trị vào Flow State sau khi node này chạy xong.
      </p>
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1 items-start">
          <Input
            value={row.key}
            onChange={(e) => updateKey(i, e.target.value)}
            placeholder="state_key"
            className="h-7 text-[12px] font-mono"
          />
          <VariablePicker
            value={row.value}
            onChange={(v) => updateValue(i, v)}
            placeholder="{{nodeId.output}}"
            rows={1}
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
        Thêm ghi state
      </Button>
    </div>
  )
}
