"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Expand } from "lucide-react"

import { useDocumentChunks } from "@/lib/hooks/use-documents"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ChunkViewerProps {
  kbId: string
  docId: string
}

interface Chunk {
  id: string
  content: string
  position: number
  charCount?: number
}

export function ChunkViewer({ kbId, docId }: ChunkViewerProps) {
  const [page, setPage] = useState(1)
  const [selectedChunk, setSelectedChunk] = useState<{ chunk: Chunk; index: number } | null>(null)
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

  const totalPages = Math.ceil((data.total || 0) / limit)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-text-muted">
          Hiển thị {(page - 1) * limit + 1}-{Math.min(page * limit, data.total || 0)} / {data.total || 0} chunks
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
          <span className="text-[13px]">Trang {page}/{totalPages}</span>
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
        {data.chunks.map((chunk, i) => {
          const chunkNumber = (page - 1) * limit + i + 1
          return (
            <Card key={chunk.id} size="sm">
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-text-muted">
                    Chunk #{chunkNumber}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-text-muted">
                      {chunk.charCount || chunk.content.length} ký tự
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => setSelectedChunk({ chunk, index: chunkNumber })}
                      title="Xem toàn bộ"
                    >
                      <Expand className="size-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-[13px] whitespace-pre-wrap line-clamp-6">
                  {chunk.content}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={!!selectedChunk} onOpenChange={() => setSelectedChunk(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Chunk #{selectedChunk?.index}</span>
              <span className="text-[13px] font-normal text-text-muted">
                {selectedChunk?.chunk.charCount || selectedChunk?.chunk.content.length} ký tự
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <pre className="text-[13px] whitespace-pre-wrap font-sans leading-relaxed">
              {selectedChunk?.chunk.content}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
