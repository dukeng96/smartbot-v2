"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { useDocumentChunks } from "@/lib/hooks/use-documents"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"

interface ChunkViewerProps {
  kbId: string
  docId: string
}

export function ChunkViewer({ kbId, docId }: ChunkViewerProps) {
  const [page, setPage] = useState(1)
  const limit = 10

  const { data, isLoading, isError } = useDocumentChunks(kbId, docId, { page, limit })

  if (isLoading) return <LoadingSkeleton variant="table" />

  if (isError) {
    return (
      <div className="text-center py-8 text-destructive">
        Không thể tải chunks. Vui lòng thử lại.
      </div>
    )
  }

  if (!data?.chunks?.length) {
    return (
      <div className="text-center py-8 text-text-muted">
        Chưa có chunks nào
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-text-muted">
          Hiển thị {data.chunks.length} / {data.total || 0} chunks
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-[13px]">Trang {page}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={!data.total || page * limit >= data.total}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {data.chunks.map((chunk, i) => (
          <Card key={chunk.id} size="sm">
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-text-muted">
                  Chunk #{(page - 1) * limit + i + 1}
                </span>
                <span className="text-[11px] text-text-muted">
                  {chunk.charCount || chunk.content.length} ký tự
                </span>
              </div>
              <p className="text-[13px] whitespace-pre-wrap line-clamp-6">
                {chunk.content}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
