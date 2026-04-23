"use client"

import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "@/components/shared/status-badge"
import type { DocumentStatus, DocumentProcessingStep } from "@/lib/types/document"

const STEP_LABELS: Record<string, string> = {
  extracting: "Trích xuất",
  chunking: "Chia đoạn",
  embedding: "Nhúng vector",
}

interface DocumentProcessingBadgeProps {
  status: DocumentStatus
  processingStep?: DocumentProcessingStep | null
  processingProgress: number
}

/**
 * Combined status badge + progress bar for document processing.
 * Shows progress bar only when status is "processing".
 */
export function DocumentProcessingBadge({
  status,
  processingStep,
  processingProgress,
}: DocumentProcessingBadgeProps) {
  if (status !== "processing") {
    return <StatusBadge status={status} />
  }

  return (
    <div className="flex flex-col gap-1 min-w-[120px]">
      <span className="text-[12px] text-text-secondary">
        {processingStep ? STEP_LABELS[processingStep] ?? processingStep : "Đang xử lý"}
      </span>
      <Progress value={processingProgress} className="h-1.5" />
      <span className="text-[11px] text-text-muted tabular-nums">
        {processingProgress}%
      </span>
    </div>
  )
}
