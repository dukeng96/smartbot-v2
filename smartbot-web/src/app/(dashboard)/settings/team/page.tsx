import { Users, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/shared/empty-state"

/**
 * H3 — Team member management.
 * Invite, remove, change role.
 * Data: GET /api/v1/tenants/:tenantId/members
 */
export default function TeamSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý nhóm"
        description="Mời và quản lý thành viên workspace"
        actions={
          <Button>
            <UserPlus className="mr-1.5 size-4" />
            Mời thành viên
          </Button>
        }
      />

      {/* TODO: DataTable with member rows + role dropdown + remove action */}

      <EmptyState
        icon={Users}
        title="Chưa có thành viên"
        description="Mời thành viên để cùng quản lý workspace"
      />
    </div>
  )
}
