"use client"

import { useState, useEffect } from "react"
import { MessageCircle, X, Trash2, Maximize2, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useFlowStore } from "../hooks/use-flow-store"
import { useTestRun } from "../hooks/use-test-run"
import { TestMessageList } from "./test-message-list"
import { TestInput } from "./test-input"

interface TestPanelProps {
  botId: string
}

export function TestPanel({ botId }: TestPanelProps) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [approvalText, setApprovalText] = useState("")
  const pushDialogDepth = useFlowStore((s) => s.pushDialogDepth)
  const popDialogDepth = useFlowStore((s) => s.popDialogDepth)
  const setTraceMap = useFlowStore((s) => s.setTraceMap)

  const { messages, traceMap, isRunning, humanInputState, sendMessage, submitHumanInput, clearMessages } = useTestRun()

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

  async function handleSubmitApproval() {
    await submitHumanInput(approvalText)
    setApprovalText("")
  }

  return (
    <>
      {/* Human input approval dialog */}
      <Dialog
        open={!!humanInputState}
        onOpenChange={(isOpen) => {
          if (!isOpen) setApprovalText("")
        }}
      >
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Yêu cầu xác nhận từ người dùng</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground whitespace-pre-wrap">
            {humanInputState?.prompt}
          </p>
          <Textarea
            value={approvalText}
            onChange={(e) => setApprovalText(e.target.value)}
            placeholder="Nhập phản hồi của bạn…"
            className="text-[13px] min-h-[80px]"
          />
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setApprovalText("")}
            >
              Bỏ qua
            </Button>
            <Button size="sm" onClick={handleSubmitApproval} disabled={!approvalText.trim()}>
              Gửi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <>
          {/* Backdrop for expanded mode */}
          {expanded && (
            <div
              className="fixed inset-0 z-20 bg-black/50"
              onClick={() => setExpanded(false)}
            />
          )}
          <div
            className={cn(
              "fixed z-30 bg-background border shadow-xl flex flex-col transition-all duration-200",
              expanded
                ? "inset-4 rounded-xl"
                : "bottom-0 right-6 w-[420px] h-[calc(100vh-100px)] max-h-[800px] border-b-0 rounded-t-xl"
            )}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
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
                onClick={() => setExpanded(!expanded)}
                title={expanded ? "Thu nhỏ" : "Mở rộng"}
              >
                {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
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
        </>
      )}
    </>
  )
}
