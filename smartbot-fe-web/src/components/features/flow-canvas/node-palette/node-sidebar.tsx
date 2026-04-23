"use client"

import { useState, useMemo, type DragEvent } from "react"
import {
  Play, Sparkles, Search, Bot, Wrench, Code, GitBranch,
  MessageSquare, Globe, User, StickyNote, Brain, type LucideIcon,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { NODE_DEFINITIONS } from "../utils/node-definitions"
import { CATEGORY_LABEL } from "../nodes/node-category-styles"
import type { NodeCategory, NodeDefinition } from "@/lib/types/flow"

const ICON_MAP: Record<string, LucideIcon> = {
  Play, Sparkles, Search, Bot, Wrench, Code, GitBranch,
  MessageSquare, Globe, User, StickyNote, Brain,
}

function groupByCategory(defs: NodeDefinition[]): Record<string, NodeDefinition[]> {
  const groups: Record<string, NodeDefinition[]> = {}
  for (const def of defs) {
    ;(groups[def.category] ??= []).push(def)
  }
  return groups
}

export function NodeSidebar() {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const visible = NODE_DEFINITIONS.filter((d) => !d.hiddenInPalette)
    const q = query.trim().toLowerCase()
    if (!q) return visible
    return visible.filter((d) =>
      `${d.label} ${d.description} ${d.type}`.toLowerCase().includes(q)
    )
  }, [query])

  const groups = useMemo(() => groupByCategory(filtered), [filtered])

  function handleDragStart(e: DragEvent<HTMLDivElement>, type: string) {
    e.dataTransfer.setData("application/reactflow", type)
    e.dataTransfer.effectAllowed = "move"
  }

  return (
    <aside className="w-64 shrink-0 border-r bg-background flex flex-col h-full">
      <div className="px-3 py-2 border-b">
        <h2 className="text-[13px] font-semibold mb-2">Add Nodes</h2>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm node…"
          className="h-8 text-[12px]"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {Object.entries(groups).length === 0 && (
          <p className="text-[12px] text-muted-foreground px-2 py-4">Không tìm thấy node.</p>
        )}
        {Object.entries(groups).map(([category, defs]) => (
          <div key={category}>
            <div className="text-[10px] font-semibold uppercase text-muted-foreground px-2 mb-1 tracking-wide">
              {CATEGORY_LABEL[category as NodeCategory] ?? category}
            </div>
            <div className="space-y-1">
              {defs.map((def) => {
                const Icon = ICON_MAP[def.icon] ?? StickyNote
                return (
                  <div
                    key={def.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, def.type)}
                    className="flex items-start gap-2 rounded-md px-2 py-1.5 border border-transparent hover:border-border hover:bg-muted cursor-grab active:cursor-grabbing transition-colors"
                    title={def.description}
                  >
                    <Icon size={14} className="shrink-0 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium truncate">{def.label}</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-2">
                        {def.description}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
