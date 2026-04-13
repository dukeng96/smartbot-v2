"use client"

import { useState } from "react"
import { ArrowLeft, Save, CheckCircle, Undo2, Redo2, AlertCircle, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useFlowStore } from "../hooks/use-flow-store"
import { useSaveFlow, useValidateFlow } from "@/lib/hooks/use-flow"
import type { FlowData } from "@/lib/types/flow"

interface CanvasToolbarProps {
  flowId: string
  botId: string
  dirty: boolean
}

export function CanvasToolbar({ flowId, botId, dirty }: CanvasToolbarProps) {
  const store = useFlowStore()
  const { mutate: saveFlow, isPending: isSaving } = useSaveFlow(flowId)
  const { mutate: validateFlow, isPending: isValidating } = useValidateFlow(flowId)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  function handleSave() {
    const { nodes, edges, name } = store
    saveFlow({ name, flowData: { nodes, edges } as FlowData })
  }

  function handleValidate() {
    setValidationErrors([])
    validateFlow(undefined, {
      onSuccess: (result) => {
        if (result.ok) {
          setValidationErrors([])
        } else {
          setValidationErrors(result.errors)
        }
      },
    })
  }

  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-10 h-12 bg-background/95 backdrop-blur border-b flex items-center gap-2 px-3">
        <Link
          href={`/bots/${botId}/config`}
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
          disabled={isValidating}
          className="h-8 gap-1"
        >
          <CheckCircle size={14} />
          {isValidating ? "Đang kiểm tra…" : "Kiểm tra"}
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={isSaving || !dirty}
          className="h-8 gap-1"
        >
          <Save size={14} />
          {isSaving ? "Đang lưu…" : "Lưu"}
        </Button>
      </div>

      {/* Validation error banner — shown below toolbar */}
      {validationErrors.length > 0 && (
        <div className="absolute top-12 left-0 right-0 z-10 bg-destructive/10 border-b border-destructive/30 px-3 py-2 flex items-start gap-2">
          <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
          <ul className="flex-1 text-[12px] text-destructive space-y-0.5">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
          <button
            onClick={() => setValidationErrors([])}
            className="text-destructive hover:text-destructive/80 shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </>
  )
}
