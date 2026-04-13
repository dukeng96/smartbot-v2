"use client"

import { memo } from "react"
import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import {
  Play, Sparkles, Search, Bot, Wrench, Code, GitBranch,
  MessageSquare, Globe, User, StickyNote, LucideIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useFlowStore } from "../hooks/use-flow-store"
import { CATEGORY_BORDER, CATEGORY_LABEL } from "./node-category-styles"
import type { NodeData, NodeCategory } from "@/lib/types/flow"

const ICON_MAP: Record<string, LucideIcon> = {
  Play, Sparkles, Search, Bot, Wrench, Code, GitBranch,
  MessageSquare, Globe, User, StickyNote,
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s
}

interface InlineTrace {
  running?: boolean
  duration?: number
  error?: string
  awaitingInput?: boolean
  outputPreview?: string
}

export const GenericNode = memo(function GenericNode({
  id,
  data,
  selected,
}: NodeProps & { data: NodeData }) {
  const setSelected = useFlowStore((s) => s.setSelected)
  const traceMap = useFlowStore((s) => (s as unknown as { traceMap?: Record<string, InlineTrace> }).traceMap)
  const trace: InlineTrace | undefined = traceMap?.[id]

  const { definition, inputAnchors, outputAnchors, config } = data
  const IconComponent = ICON_MAP[definition.icon] ?? StickyNote
  const category = definition.category as NodeCategory

  const previewEntries = Object.entries(config).slice(0, 3)

  return (
    <div
      className={cn(
        "rounded-lg border bg-card shadow-sm min-w-[220px] cursor-pointer select-none",
        CATEGORY_BORDER[category],
        selected && "ring-2 ring-primary",
        trace?.error && "ring-2 ring-destructive",
        trace?.awaitingInput && "ring-2 ring-warning",
        trace?.running && !trace.awaitingInput && "animate-pulse"
      )}
      onClick={() => setSelected(id)}
    >
      {/* Input handles */}
      {inputAnchors.map((a, i) => (
        <Handle
          key={a.id}
          type="target"
          position={Position.Left}
          id={a.id}
          style={{ top: 44 + i * 22 }}
          className="!w-3 !h-3 !bg-muted-foreground"
        />
      ))}

      {/* Header */}
      <div className="px-3 py-2 border-b flex items-center gap-2">
        <IconComponent size={14} className="shrink-0" />
        <span className="font-semibold text-[13px] truncate flex-1">
          {definition.label}
        </span>
        <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">
          {CATEGORY_LABEL[category]}
        </Badge>
      </div>

      {/* Config preview */}
      {previewEntries.length > 0 && (
        <div className="p-3 space-y-1 text-[12px] text-muted-foreground">
          {previewEntries.map(([k, v]) => (
            <div key={k} className="flex gap-1">
              <span className="shrink-0">{k}:</span>
              <span className="font-mono truncate">
                {truncate(String(v ?? ""), 28)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Inline trace badge */}
      {trace && (
        <div className="px-3 py-1 border-t bg-muted/30 text-[11px] flex items-center justify-between gap-1">
          {trace.awaitingInput ? (
            <span className="text-warning font-medium">Chờ phê duyệt</span>
          ) : (
            <>
              {trace.duration !== undefined && <span>{trace.duration}ms</span>}
              {trace.outputPreview && (
                <span className="font-mono text-muted-foreground truncate max-w-[120px]">
                  {trace.outputPreview}
                </span>
              )}
            </>
          )}
          {trace.error && (
            <span className="text-destructive truncate">{trace.error}</span>
          )}
        </div>
      )}

      {/* Output handles */}
      {outputAnchors.map((a, i) => (
        <Handle
          key={a.id}
          type="source"
          position={Position.Right}
          id={a.id}
          style={{ top: 44 + i * 22 }}
          className="!w-3 !h-3 !bg-primary"
        />
      ))}
    </div>
  )
})
