"use client"

import React, { lazy, Suspense, useMemo } from "react"
import { Group, Panel, Separator } from "react-resizable-panels"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"

import { Card, CardContent } from "@/components/ui/card"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import {
  useDocumentDownloadUrl,
  useDocumentMarkdownUrl,
  useDocumentMarkdownContent,
} from "@/lib/hooks/use-documents"
import { DocumentMarkdownImage } from "./document-markdown-image"
import type { KBDocument } from "@/lib/types/document"

const PdfViewer = lazy(() =>
  import("@/components/ui/pdf-viewer").then((m) => ({ default: m.PdfViewer }))
)

interface DocumentPreviewSplitProps {
  kbId: string
  doc: KBDocument
}

export function DocumentPreviewSplit({ kbId, doc }: DocumentPreviewSplitProps) {
  const isPdf = doc.mimeType === "application/pdf"
  const hasStoragePath = !!doc.storagePath
  const hasMarkdown = !!doc.markdownStoragePath

  const { data: downloadData, isLoading: downloadLoading } = useDocumentDownloadUrl(
    kbId,
    doc.id,
    isPdf && hasStoragePath,
  )

  const { data: markdownUrlData, isLoading: markdownUrlLoading } = useDocumentMarkdownUrl(
    kbId,
    doc.id,
    hasMarkdown,
  )

  const { data: markdownContent, isLoading: markdownContentLoading } = useDocumentMarkdownContent(
    markdownUrlData?.url,
  )

  const isMarkdownLoading = markdownUrlLoading || markdownContentLoading

  const markdownComponents = useMemo(
    () => ({
      img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
        <DocumentMarkdownImage
          src={typeof props.src === "string" ? props.src : undefined}
          alt={props.alt}
          kbId={kbId}
          docId={doc.id}
        />
      ),
    }),
    [kbId, doc.id],
  )

  // Non-PDF files or files without storage: show text/markdown only
  if (!isPdf || !hasStoragePath) {
    return (
      <Card>
        <CardContent>
          {doc.sourceType === "text_input" || doc.sourceType === "url_crawl" ? (
            <pre className="whitespace-pre-wrap text-[13px] max-h-[600px] overflow-auto">
              {typeof doc.metadata?.extractedText === "string"
                ? doc.metadata.extractedText
                : "Nội dung không khả dụng"}
            </pre>
          ) : hasMarkdown ? (
            isMarkdownLoading ? (
              <LoadingSkeleton variant="cards" />
            ) : (
              <div className="prose prose-sm max-w-none max-h-[600px] overflow-auto">
                <ReactMarkdown rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                  {markdownContent || ""}
                </ReactMarkdown>
              </div>
            )
          ) : (
            <p className="text-center py-8 text-text-muted">
              Xem trước không khả dụng cho loại tệp này
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // PDF with markdown: side-by-side view
  if (hasMarkdown) {
    return (
      <Group orientation="horizontal" className="min-h-[600px]">
        <Panel defaultSize={50} minSize={30}>
          <Card className="h-full">
            <CardContent className="h-full p-2">
              <div className="text-[12px] text-text-muted mb-2 px-2">PDF gốc</div>
              {downloadLoading ? (
                <LoadingSkeleton variant="cards" />
              ) : downloadData?.url ? (
                <Suspense fallback={<LoadingSkeleton variant="cards" />}>
                  <PdfViewer url={downloadData.url} />
                </Suspense>
              ) : (
                <p className="text-center py-8 text-text-muted">
                  Không thể tải URL của tệp
                </p>
              )}
            </CardContent>
          </Card>
        </Panel>

        <Separator className="w-2 bg-border hover:bg-primary/20 transition-colors cursor-col-resize" />

        <Panel defaultSize={50} minSize={30}>
          <Card className="h-full">
            <CardContent className="h-full p-2 flex flex-col">
              <div className="text-[12px] text-text-muted mb-2 px-2">Markdown (OCR)</div>
              {isMarkdownLoading ? (
                <LoadingSkeleton variant="cards" />
              ) : (
                <div className="flex-1 overflow-auto prose prose-sm max-w-none px-2">
                  <ReactMarkdown rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                    {markdownContent || ""}
                  </ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>
        </Panel>
      </Group>
    )
  }

  // PDF without markdown: just PDF viewer
  return (
    <Card>
      <CardContent>
        {downloadLoading ? (
          <LoadingSkeleton variant="cards" />
        ) : downloadData?.url ? (
          <Suspense fallback={<LoadingSkeleton variant="cards" />}>
            <PdfViewer url={downloadData.url} />
          </Suspense>
        ) : (
          <p className="text-center py-8 text-text-muted">
            Không thể tải URL của tệp
          </p>
        )}
      </CardContent>
    </Card>
  )
}
