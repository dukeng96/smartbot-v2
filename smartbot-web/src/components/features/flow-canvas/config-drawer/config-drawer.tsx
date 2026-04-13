"use client"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Play, Sparkles, Search, Bot, Wrench, Code, GitBranch,
  MessageSquare, Globe, User, StickyNote, type LucideIcon,
} from "lucide-react"
import { useFlowStore } from "../hooks/use-flow-store"
import { InputEditor } from "./input-editor"
import { UpdateFlowStateEditor } from "./update-flow-state-editor"
import { useEffect } from "react"

const ICON_MAP: Record<string, LucideIcon> = {
  Play, Sparkles, Search, Bot, Wrench, Code, GitBranch,
  MessageSquare, Globe, User, StickyNote,
}

export function ConfigDrawer() {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId)
  const nodes = useFlowStore((s) => s.nodes)
  const setSelected = useFlowStore((s) => s.setSelected)
  const updateNodeConfig = useFlowStore((s) => s.updateNodeConfig)
  const pushDialogDepth = useFlowStore((s) => s.pushDialogDepth)
  const popDialogDepth = useFlowStore((s) => s.popDialogDepth)

  const node = nodes.find((n) => n.id === selectedNodeId)
  const open = !!node

  // Track drawer open state in dialogDepth so keyboard shortcuts are suppressed
  useEffect(() => {
    if (open) {
      pushDialogDepth()
    } else {
      popDialogDepth()
    }
    // Only run on open toggle — not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) setSelected(null)
  }

  // Config fields — exclude connectable handles (those are wired, not configured)
  const configInputs = node?.data.definition.inputs.filter(
    (i) => !i.connectableHandle
  ) ?? []

  const IconComponent = node
    ? (ICON_MAP[node.data.definition.icon] ?? StickyNote)
    : StickyNote

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-[400px] sm:max-w-[400px] overflow-y-auto"
      >
        {node && (
          <>
            <SheetHeader className="pb-2">
              <SheetTitle className="flex items-center gap-2 text-[15px]">
                <IconComponent size={16} />
                {node.data.definition.label}
              </SheetTitle>
              <SheetDescription className="text-[12px]">
                {node.data.definition.description}
              </SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="inputs" className="mt-2">
              <TabsList className="w-full">
                <TabsTrigger value="inputs" className="flex-1 text-[12px]">
                  Inputs
                </TabsTrigger>
                <TabsTrigger value="state" className="flex-1 text-[12px]">
                  Update State
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex-1 text-[12px]">
                  Advanced
                </TabsTrigger>
              </TabsList>

              <TabsContent value="inputs" className="space-y-4 mt-3">
                {configInputs.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">
                    Node này không có trường cấu hình.
                  </p>
                ) : (
                  configInputs.map((input) => (
                    <InputEditor
                      key={input.name}
                      input={input}
                      value={node.data.config?.[input.name]}
                      nodeId={node.id}
                      onChange={(v) => updateNodeConfig(node.id, input.name, v)}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="state" className="mt-3">
                <UpdateFlowStateEditor nodeId={node.id} />
              </TabsContent>

              <TabsContent value="advanced" className="space-y-3 mt-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Node ID
                  </p>
                  <code className="text-[11px] font-mono bg-muted px-2 py-1 rounded block break-all">
                    {node.id}
                  </code>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Vị trí
                  </p>
                  <code className="text-[11px] font-mono bg-muted px-2 py-1 rounded block">
                    x: {Math.round(node.position.x)}, y: {Math.round(node.position.y)}
                  </code>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
