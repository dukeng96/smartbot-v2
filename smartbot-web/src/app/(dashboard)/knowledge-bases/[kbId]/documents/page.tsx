import { FileText, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"

/**
 * D3 — Document list in Knowledge Base.
 * Data: GET /api/v1/knowledge-bases/:kbId/documents
 */
export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tài liệu"
        description="Quản lý tài liệu trong Knowledge Base"
        actions={
          <Button>
            <Upload className="mr-1.5 size-4" />
            Upload tài liệu
          </Button>
        }
      />

      {/* TODO: DataTable + upload modal with FileUploadZone */}

      <EmptyState
        icon={FileText}
        title="Chưa có tài liệu"
        description="Upload tài liệu PDF, DOCX, TXT để assistant có thể tham khảo"
      />
    </div>
  )
}
