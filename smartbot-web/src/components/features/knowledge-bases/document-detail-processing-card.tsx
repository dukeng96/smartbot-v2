"use client"

import { Check, X, Circle, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import type { KBDocument, DocumentProcessingStep } from "@/lib/types/document"
import { cn } from "@/lib/utils"

const STEPS: { key: DocumentProcessingStep; label: string }[] = [
  { key: "extracting", label: "Trích xuất" },
  { key: "chunking", label: "Chia đoạn" },
  { key: "embedding", label: "Nhúng vector" },
]

interface DocumentDetailProcessingCardProps {
  doc: KBDocument
  onReprocess: () => void
  reprocessing?: boolean
}

type StepState = "completed" | "active" | "error" | "pending"

function getStepState(
  stepKey: DocumentProcessingStep,
  doc: KBDocument,
): StepState {
  const stepIndex = STEPS.findIndex((s) => s.key === stepKey)
  const currentIndex = doc.processingStep
    ? STEPS.findIndex((s) => s.key === doc.processingStep)
    : -1

  if (doc.status === "completed") return "completed"
  if (doc.status === "error") {
    if (stepIndex < currentIndex) return "completed"
    if (stepIndex === currentIndex) return "error"
    return "pending"
  }
  if (doc.status === "processing") {
    if (stepIndex < currentIndex) return "completed"
    if (stepIndex === currentIndex) return "active"
    return "pending"
  }
  return "pending"
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "completed")
    return <Check className="size-4 text-white" />
  if (state === "error")
    return <X className="size-4 text-white" />
  if (state === "active")
    return <Circle className="size-3 animate-pulse text-white" />
  return <Circle className="size-3 text-text-muted" />
}

export function DocumentDetailProcessingCard({
  doc,
  onReprocess,
  reprocessing,
}: DocumentDetailProcessingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trạng thái xử lý</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Horizontal stepper */}
        <div className="flex items-center gap-2">
          {STEPS.map((step, i) => {
            const state = getStepState(step.key, doc)
            return (
              <div key={step.key} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full",
                    state === "completed" && "bg-[#059669]",
                    state === "active" && "bg-[#2563EB]",
                    state === "error" && "bg-[#DC2626]",
                    state === "pending" && "bg-muted",
                  )}
                >
                  <StepIcon state={state} />
                </div>
                <span className={cn(
                  "text-[12px] whitespace-nowrap",
                  state === "pending" ? "text-text-muted" : "text-foreground font-medium",
                )}>
                  {step.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    "h-px flex-1",
                    state === "completed" ? "bg-[#059669]" : "bg-border",
                  )} />
                )}
              </div>
            )
          })}
        </div>

        {/* Progress bar for processing */}
        {doc.status === "processing" && (
          <Progress value={doc.processingProgress} />
        )}

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          {doc.processingStartedAt && (
            <div>
              <p className="text-text-muted">Bắt đầu</p>
              <p className="font-medium">
                {format(new Date(doc.processingStartedAt), "dd/MM/yyyy HH:mm:ss", { locale: vi })}
              </p>
            </div>
          )}
          {doc.processingCompletedAt && (
            <div>
              <p className="text-text-muted">Hoàn thành</p>
              <p className="font-medium">
                {format(new Date(doc.processingCompletedAt), "dd/MM/yyyy HH:mm:ss", { locale: vi })}
              </p>
            </div>
          )}
        </div>

        {/* Error alert */}
        {doc.status === "error" && doc.errorMessage && (
          <div className="flex items-start gap-2 rounded-lg bg-[#FEF2F2] p-3">
            <AlertCircle className="size-4 shrink-0 text-[#DC2626] mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#DC2626]">Lỗi xử lý</p>
              <p className="text-[12px] text-[#991B1B] mt-0.5">{doc.errorMessage}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={onReprocess}
                disabled={reprocessing}
              >
                {reprocessing ? "Đang xử lý..." : "Thử lại"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
