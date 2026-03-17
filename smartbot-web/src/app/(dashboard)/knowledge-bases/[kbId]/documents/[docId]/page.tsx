import { PageHeader } from "@/components/layout/page-header"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"

/**
 * D4 — Document detail.
 * Shows document metadata, processing status, chunks preview.
 * Data: GET /api/v1/knowledge-bases/:kbId/documents/:docId
 */
export default function DocumentDetailPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Chi tiết tài liệu" />
      {/* TODO: Document metadata + status + chunks list */}
      <LoadingSkeleton variant="detail" />
    </div>
  )
}
