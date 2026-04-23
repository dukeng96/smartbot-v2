"use client"

import { useState } from "react"
import { X, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { FileUploadZone } from "@/components/shared/file-upload-zone"
import { useUploadDocument } from "@/lib/hooks/use-documents"

const ACCEPTED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "text/plain": [".txt"],
  "text/csv": [".csv"],
}

const MAX_SIZE = 128 * 1024 * 1024 // 128MB

interface DocumentUploadDialogProps {
  kbId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentUploadDialog({ kbId, open, onOpenChange }: DocumentUploadDialogProps) {
  const [files, setFiles] = useState<File[]>([])
  const uploadMutation = useUploadDocument(kbId)
  const [uploading, setUploading] = useState(false)

  function handleAddFiles(newFiles: File[]) {
    setFiles((prev) => [...prev, ...newFiles])
  }

  function handleRemoveFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleUpload() {
    setUploading(true)
    try {
      for (const file of files) {
        await uploadMutation.mutateAsync(file)
      }
      setFiles([])
      onOpenChange(false)
    } finally {
      setUploading(false)
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Upload tệp</DialogTitle>
          <DialogDescription>
            Hỗ trợ: PDF, DOCX, PPTX, XLSX, TXT, CSV. Tối đa 128MB/tệp.
          </DialogDescription>
        </DialogHeader>

        <FileUploadZone
          onFiles={handleAddFiles}
          accept={ACCEPTED_TYPES}
          maxSize={MAX_SIZE}
          multiple
        />

        {files.length > 0 && (
          <div className="max-h-[200px] overflow-y-auto space-y-2">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="size-4 shrink-0 text-text-muted" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{file.name}</p>
                    <p className="text-[11px] text-text-muted">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemoveFile(i)}
                  disabled={uploading}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={uploading}>
            Hủy
          </Button>
          <Button onClick={handleUpload} disabled={files.length === 0 || uploading}>
            {uploading ? "Đang upload..." : `Upload & Xử lý (${files.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
