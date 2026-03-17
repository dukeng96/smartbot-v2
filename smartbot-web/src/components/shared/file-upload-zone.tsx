"use client"

import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload } from "lucide-react"

import { cn } from "@/lib/utils"

interface FileUploadZoneProps {
  onFiles: (files: File[]) => void
  accept?: Record<string, string[]>
  maxSize?: number
  multiple?: boolean
  className?: string
}

/**
 * Drag-and-drop file upload zone — used in D3 document upload modal.
 * Wraps react-dropzone with design-system styling.
 */
export function FileUploadZone({
  onFiles,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = true,
  className,
}: FileUploadZoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onFiles(accepted)
    },
    [onFiles],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple,
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border px-6 py-10 transition-colors",
        isDragActive && "border-primary bg-[#EDE9FE]/30",
        className,
      )}
    >
      <input {...getInputProps()} />
      <Upload className="size-8 text-text-muted" />
      <p className="mt-3 text-[13px] font-medium text-foreground">
        {isDragActive ? "Thả tệp vào đây" : "Kéo thả tệp hoặc nhấn để chọn"}
      </p>
      <p className="mt-1 text-[12px] text-text-muted">
        Tối đa {Math.round(maxSize / 1024 / 1024)}MB mỗi tệp
      </p>
    </div>
  )
}
