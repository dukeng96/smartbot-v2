"use client"

import { useState, useEffect } from "react"
import { MessageCircle, X, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFlowStore } from "../hooks/use-flow-store"
import { useTestRun } from "../hooks/use-test-run"
import { TestMessageList } from "./test-message-list"
import { TestInput } from "./test-input"

interface TestPanelProps {
  botId: string
}

export function TestPanel({ botId }: TestPanelProps) {
  const [open, setOpen] = useState(false)
  const pushDialogDepth = useFlowStore((s) => s.pushDialogDepth)
  const popDialogDepth = useFlowStore((s) => s.popDialogDepth)
  const setTraceMap = useFlowStore((s) => s.setTraceMap)

  const { messages, traceMap, isRunning, sendMessage, clearMessages } = useTestRun()

  // Sync traceMap into store so GenericNode can read inline trace badges
  useEffect(() => {
    setTraceMap(traceMap)
  }, [traceMap, setTraceMap])

  function handleOpen() {
    pushDialogDepth()
    setOpen(true)
  }

  function handleClose() {
    popDialogDepth()
    setOpen(false)
  }

  function handleSend(content: string) {
    sendMessage(botId, content)
  }

  return (
    <>
      {/* Collapsed pill button */}
      {!open && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-20 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg hover:bg-primary/90 text-[13px] font-medium"
        >
          <MessageCircle size={15} />
          Kiểm thử Flow
        </button>
      )}

      {/* Expanded drawer */}
      {open && (
        <div className="fixed bottom-0 right-6 z-20 w-[380px] h-[520px] bg-background border border-b-0 rounded-t-xl shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <MessageCircle size={15} className="text-primary" />
            <span className="font-semibold text-[14px] flex-1">Kiểm thử Flow</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={clearMessages}
              title="Xóa lịch sử"
            >
              <Trash2 size={13} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleClose}
            >
              <X size={13} />
            </Button>
          </div>

          {/* Message list */}
          <TestMessageList messages={messages} className="flex-1 overflow-y-auto" />

          {/* Input */}
          <TestInput onSend={handleSend} disabled={isRunning} />
        </div>
      )}
    </>
  )
}
