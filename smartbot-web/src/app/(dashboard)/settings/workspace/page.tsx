import { PageHeader } from "@/components/layout/page-header"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"

/**
 * H2 — Workspace/tenant settings.
 * Form: workspace name, logo, default bot settings.
 * Data: GET /api/v1/tenants/:tenantId, PATCH /api/v1/tenants/:tenantId
 */
export default function WorkspaceSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Workspace" description="Cài đặt workspace chung" />

      {/* TODO: Workspace settings form */}
      <LoadingSkeleton variant="form" />
    </div>
  )
}
