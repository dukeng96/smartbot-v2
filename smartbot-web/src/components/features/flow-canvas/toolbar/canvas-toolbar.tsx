"use client"

import { ArrowLeft, Save, CheckCircle, Undo2, Redo2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useFlowStore } from "../hooks/use-flow-store"
import { useSaveFlow } from "@/lib/hooks/use-flow"
import { validateFlow } from "../utils/flow-validators"
import { toast } from "sonner"
import type { FlowData } from "@/lib/types/flow"

interface CanvasToolbarProps {
  flowId: string
  dirty: boolean
}

export function CanvasToolbar({ flowId, dirty }: CanvasToolbarProps) {
  const store = useFlowStore()
  const { mutate: saveFlow, isPending } = useSaveFlow(flowId)

  function handleSave() {
    const { nodes, edges, name } = store
    saveFlow({ name, flowData: { nodes, edges } as FlowData })
  }

  function handleValidate() {
    const errors = validateFlow(store.nodes, store.edges)
    if (errors.length === 0) {
      toast.success("Flow hợp lệ — không có lỗi")
    } else {
      for (const err of errors) {
        toast.error(err.message)
      }
    }
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-10 h-12 bg-background/95 backdrop-blur border-b flex items-center gap-2 px-3">
      <Link
        href={`/bots/${store.flowId ? "" : ""}`}
        className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
      </Link>

      <span className="font-semibold text-[14px] truncate max-w-[200px]">
        {store.name || "Flow"}
      </span>

      {dirty && (
        <Badge variant="secondary" className="text-[10px]">
          Chưa lưu
        </Badge>
      )}

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="sm"
        disabled
        title="Ctrl+Z (sắp có)"
        className="h-8 px-2"
      >
        <Undo2 size={14} />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        disabled
        title="Ctrl+Shift+Z (sắp có)"
        className="h-8 px-2"
      >
        <Redo2 size={14} />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleValidate}
        className="h-8 gap-1"
      >
        <CheckCircle size={14} />
        Kiểm tra
      </Button>

      <Button
        variant="default"
        size="sm"
        onClick={handleSave}
        disabled={isPending || !dirty}
        className="h-8 gap-1"
      >
        <Save size={14} />
        {isPending ? "Đang lưu…" : "Lưu"}
      </Button>
    </div>
  )
}
