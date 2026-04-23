"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VariablePicker } from "./variable-picker"
import type { ConditionRule } from "@/lib/types/flow"

interface ConditionsArrayEditorProps {
  value: ConditionRule[]
  onChange: (value: ConditionRule[]) => void
}

type ConditionType = ConditionRule["type"]

const TYPE_OPTIONS: Array<{ label: string; value: ConditionType }> = [
  { label: "String", value: "string" },
  { label: "Number", value: "number" },
  { label: "Boolean", value: "boolean" },
]

const OPERATIONS: Record<ConditionType, Array<{ label: string; value: string }>> = {
  string: [
    { value: "equal", label: "Bằng" },
    { value: "not_equal", label: "Khác" },
    { value: "contains", label: "Chứa" },
    { value: "starts_with", label: "Bắt đầu với" },
    { value: "ends_with", label: "Kết thúc với" },
    { value: "is_empty", label: "Rỗng" },
    { value: "is_not_empty", label: "Không rỗng" },
  ],
  number: [
    { value: "equal", label: "=" },
    { value: "not_equal", label: "≠" },
    { value: "greater_than", label: ">" },
    { value: "less_than", label: "<" },
    { value: "gte", label: "≥" },
    { value: "lte", label: "≤" },
  ],
  boolean: [
    { value: "is_true", label: "Là True" },
    { value: "is_false", label: "Là False" },
  ],
}

const NO_VALUE2_OPS = ["is_empty", "is_not_empty", "is_true", "is_false"]

export function ConditionsArrayEditor({ value, onChange }: ConditionsArrayEditorProps) {
  function addCondition() {
    const newCondition: ConditionRule = {
      type: "string",
      value1: "",
      operation: "equal",
      value2: "",
    }
    onChange([...value, newCondition])
  }

  function removeCondition(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function updateField<K extends keyof ConditionRule>(
    index: number,
    field: K,
    fieldValue: ConditionRule[K]
  ) {
    onChange(
      value.map((cond, i) => {
        if (i !== index) return cond
        const updated = { ...cond, [field]: fieldValue }
        // Reset operation when type changes
        if (field === "type") {
          const newType = fieldValue as ConditionType
          const validOps = OPERATIONS[newType]
          if (!validOps.some((op) => op.value === updated.operation)) {
            updated.operation = validOps[0].value
          }
        }
        return updated
      })
    )
  }

  return (
    <div className="space-y-2">
      {value.map((cond, i) => {
        const ops = OPERATIONS[cond.type]
        const showValue2 = !NO_VALUE2_OPS.includes(cond.operation)

        return (
          <div key={i} className="border rounded-md p-2 space-y-2 bg-muted/30">
            {/* Header: index + delete */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                Điều kiện {i}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={() => removeCondition(i)}
              >
                <Trash2 size={12} />
              </Button>
            </div>

            {/* Type selector */}
            <Select
              value={cond.type}
              onValueChange={(v) => updateField(i, "type", v as ConditionType)}
            >
              <SelectTrigger className="h-7 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-[12px]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value 1 */}
            <VariablePicker
              value={cond.value1}
              onChange={(v) => updateField(i, "value1", v as string)}
              placeholder="Giá trị 1 (hỗ trợ {{variable}})"
            />

            {/* Operation selector */}
            <Select
              value={cond.operation}
              onValueChange={(v) => updateField(i, "operation", v as string)}
            >
              <SelectTrigger className="h-7 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ops.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-[12px]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value 2 (hidden for unary operations) */}
            {showValue2 && (
              <VariablePicker
                value={cond.value2}
                onChange={(v) => updateField(i, "value2", v as string)}
                placeholder="Giá trị 2"
              />
            )}
          </div>
        )
      })}

      <Button variant="outline" size="sm" className="w-full h-7 text-[12px]" onClick={addCondition}>
        <Plus size={12} className="mr-1" />
        Thêm điều kiện
      </Button>
    </div>
  )
}
