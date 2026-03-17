import { PageHeader } from "@/components/layout/page-header"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"

/**
 * D2 — Knowledge Base detail + settings.
 * Data: GET /api/v1/knowledge-bases/:kbId
 */
export default function KnowledgeBaseDetailPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Chi tiết Knowledge Base" />
      {/* TODO: KB settings form + stats */}
      <LoadingSkeleton variant="detail" />
    </div>
  )
}
