"use client"

import { forwardRef, useImperativeHandle, useState, useCallback } from "react"
import {
  Play, Sparkles, Search, Bot, Wrench, Code, GitBranch,
  MessageSquare, Globe, User, StickyNote, type LucideIcon,
} from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useFlowStore } from "../hooks/use-flow-store"
import { useDialogDepth } from "../hooks/use-dialog-depth"
import { NODE_DEFINITIONS } from "../utils/node-definitions"
import { CATEGORY_LABEL } from "../nodes/node-category-styles"
import type { NodeCategory, NodeDefinition } from "@/lib/types/flow"

const ICON_MAP: Record<string, LucideIcon> = {
  Play, Sparkles, Search, Bot, Wrench, Code, GitBranch,
  MessageSquare, Globe, User, StickyNote,
}

// Group definitions by category
function groupByCategory(defs: NodeDefinition[]): Record<string, NodeDefinition[]> {
  const groups: Record<string, NodeDefinition[]> = {}
  for (const def of defs) {
    ;(groups[def.category] ??= []).push(def)
  }
  return groups
}

export interface NodePaletteHandle {
  open(): void
}

export const NodePalette = forwardRef<NodePaletteHandle>(function NodePalette(_props, ref) {
  const [open, setOpen] = useState(false)
  const { addNode, pushDialogDepth, popDialogDepth } = useFlowStore()

  useImperativeHandle(ref, () => ({
    open() {
      pushDialogDepth()
      setOpen(true)
    },
  }))

  const handleClose = useCallback(() => {
    popDialogDepth()
    setOpen(false)
  }, [popDialogDepth])

  const handleSelect = useCallback(
    (def: NodeDefinition) => {
      // Place new node at a reasonable default position in viewport center
      addNode(def, { x: 300 + Math.random() * 100, y: 200 + Math.random() * 100 })
      handleClose()
    },
    [addNode, handleClose]
  )

  const groups = groupByCategory(NODE_DEFINITIONS)

  return (
    <CommandDialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <CommandInput placeholder="Tìm node… (Cmd+K)" />
      <CommandList>
        <CommandEmpty>Không tìm thấy node nào.</CommandEmpty>
        {Object.entries(groups).map(([category, defs]) => (
          <CommandGroup key={category} heading={CATEGORY_LABEL[category as NodeCategory] ?? category}>
            {defs.map((def) => {
              const IconComponent = ICON_MAP[def.icon] ?? StickyNote
              return (
                <CommandItem
                  key={def.type}
                  value={`${def.label} ${def.description} ${def.type}`}
                  onSelect={() => handleSelect(def)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <IconComponent size={14} className="shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium">{def.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {def.description}
                    </div>
                  </div>
                </CommandItem>
              )
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
})
