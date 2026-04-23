"use client"

import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"
import { useCustomTools } from "@/lib/hooks/use-flow"

interface CustomToolPickerProps {
  value: string | string[]
  onChange: (value: string | string[]) => void
  mode?: "multi" | "single"
}

export function CustomToolPicker({ value, onChange, mode = "multi" }: CustomToolPickerProps) {
  const { data: tools, isLoading } = useCustomTools()

  function toggle(id: string) {
    const arr = Array.isArray(value) ? value : []
    if (arr.includes(id)) {
      onChange(arr.filter((v) => v !== id))
    } else {
      onChange([...arr, id])
    }
  }

  if (isLoading) {
    return <p className="text-[12px] text-muted-foreground">Đang tải tools…</p>
  }

  if (!tools?.length) {
    return (
      <p className="text-[12px] text-muted-foreground">
        Chưa có Custom Tool nào. Tạo tool tại mục{" "}
        <a href="/custom-tools" className="underline">
          Custom Tools
        </a>
        .
      </p>
    )
  }

  if (mode === "single") {
    return (
      <Select value={typeof value === "string" ? value : ""} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger className="h-8 text-[13px]">
          <SelectValue placeholder="Chọn tool…" />
        </SelectTrigger>
        <SelectContent>
          {tools.map((tool) => (
            <SelectItem key={tool.id} value={tool.id} className="text-[13px]">
              {tool.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  const selected = Array.isArray(value) ? value : []

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((id) => {
            const tool = tools.find((t) => t.id === id)
            return (
              <Badge key={id} variant="secondary" className="gap-1 pr-1 text-[11px]">
                {tool?.name ?? id}
                <button type="button" onClick={() => toggle(id)} className="ml-0.5 hover:text-destructive">
                  <X size={10} />
                </button>
              </Badge>
            )
          })}
        </div>
      )}

      {/* Selectable tool list */}
      <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
        {tools.map((tool) => {
          const isSelected = selected.includes(tool.id)
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => toggle(tool.id)}
              className={`w-full text-left px-3 py-2 text-[12px] hover:bg-accent flex items-start gap-2 ${
                isSelected ? "bg-primary/5" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{tool.name}</div>
                <div className="text-muted-foreground truncate">{tool.description}</div>
              </div>
              {isSelected && (
                <Badge variant="default" className="text-[10px] shrink-0">
                  Đã chọn
                </Badge>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
