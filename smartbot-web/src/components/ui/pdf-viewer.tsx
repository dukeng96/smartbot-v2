"use client"

import { useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "./button"
import { LoadingSkeleton } from "../shared/loading-skeleton"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

interface PdfViewerProps {
  url: string
  className?: string
}

export function PdfViewer({ url, className }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [scale, setScale] = useState(1.0)

  return (
    <div className={className}>
      <div className="flex items-center gap-2 border-b p-2 text-[13px]">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span>
          {page} / {numPages}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPage((p) => Math.min(numPages, p + 1))}
          disabled={page >= numPages}
        >
          <ChevronRight className="size-4" />
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
        >
          <ZoomOut className="size-4" />
        </Button>
        <span>{Math.round(scale * 100)}%</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setScale((s) => Math.min(2, s + 0.25))}
        >
          <ZoomIn className="size-4" />
        </Button>
      </div>

      <div className="overflow-auto p-4 bg-muted/30 min-h-[400px]">
        <Document
          file={url}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={<LoadingSkeleton variant="cards" />}
          error={
            <div className="text-center text-text-muted py-8">
              Không thể tải PDF
            </div>
          }
        >
          <Page pageNumber={page} scale={scale} />
        </Document>
      </div>
    </div>
  )
}
