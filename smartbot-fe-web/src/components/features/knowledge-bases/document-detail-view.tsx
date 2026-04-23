"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { DocumentDetailInfoCard } from "./document-detail-info-card"
import { DocumentDetailProcessingCard } from "./document-detail-processing-card"
import { DocumentPreviewSplit } from "./document-preview-split"
import { ChunkViewer } from "./chunk-viewer"
import type { KBDocument } from "@/lib/types/document"
import {
  useToggleDocument,
  useReprocessDocument,
  useDeleteDocument,
} from "@/lib/hooks/use-documents"

interface DocumentDetailViewProps {
  kbId: string
  doc: KBDocument
  onDeleted: () => void
}

export function DocumentDetailView({ kbId, doc, onDeleted }: DocumentDetailViewProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const toggleMutation = useToggleDocument(kbId)
  const reprocessMutation = useReprocessDocument(kbId)
  const deleteMutation = useDeleteDocument(kbId)

  function handleDelete() {
    deleteMutation.mutate(doc.id, { onSuccess: onDeleted })
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">Xem trước</TabsTrigger>
          <TabsTrigger value="info">Thông tin</TabsTrigger>
          <TabsTrigger value="chunks">Chunks ({doc.chunkCount})</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="preview">
          <DocumentPreviewSplit kbId={kbId} doc={doc} />
        </TabsContent>

        <TabsContent value="info">
          <div className="space-y-6">
            <DocumentDetailInfoCard
              doc={doc}
              onToggle={(enabled) =>
                toggleMutation.mutate({ docId: doc.id, enabled })
              }
            />

            {/* Only show processing card when not completed */}
            {doc.status !== "completed" && (
              <DocumentDetailProcessingCard
                doc={doc}
                onReprocess={() => reprocessMutation.mutate(doc.id)}
                reprocessing={reprocessMutation.isPending}
              />
            )}

            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card size="sm">
                <CardContent className="text-center">
                  <p className="text-[12px] text-text-muted">Ký tự</p>
                  <p className="text-[18px] font-semibold">
                    {doc.charCount.toLocaleString("vi-VN")}
                  </p>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardContent className="text-center">
                  <p className="text-[12px] text-text-muted">Chunks</p>
                  <p className="text-[18px] font-semibold">
                    {doc.chunkCount.toLocaleString("vi-VN")}
                  </p>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardContent className="text-center">
                  <p className="text-[12px] text-text-muted">Markdown</p>
                  <p className="text-[18px] font-semibold">
                    {doc.markdownStoragePath ? "Có" : "Không"}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chunks">
          <ChunkViewer kbId={kbId} docId={doc.id} />
        </TabsContent>

        <TabsContent value="metadata">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[400px] overflow-auto rounded-lg bg-muted p-3 text-[12px]">
                {JSON.stringify(doc.metadata, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => reprocessMutation.mutate(doc.id)}
          disabled={reprocessMutation.isPending}
        >
          {reprocessMutation.isPending ? "Đang xử lý..." : "Reprocess"}
        </Button>
        <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
          Xóa
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Xóa tài liệu"
        message={`Bạn có chắc muốn xóa "${doc.originalName || "tài liệu"}"? Hành động này không thể hoàn tác.`}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
