"use client"

import { useState } from "react"
import { Users, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { ErrorState } from "@/components/shared/error-state"
import { EmptyState } from "@/components/shared/empty-state"
import { SettingsTabs } from "@/components/features/settings/settings-tabs"
import { TeamMembersTable } from "@/components/features/settings/team-members-table"
import { InviteMemberDialog } from "@/components/features/settings/invite-member-dialog"
import { DataTablePagination } from "@/components/shared/data-table-pagination"
import { useTeamMembers } from "@/lib/hooks/use-team"
import { useAuthStore } from "@/lib/stores/auth-store"

/**
 * H3 — Team member management page.
 * Invite, remove, change role. Uses DataTable with pagination.
 */
export default function TeamSettingsPage() {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [page, setPage] = useState(1)
  const tenantId = useAuthStore((s) => s.tenant?.id) ?? null
  const currentUserId = useAuthStore((s) => s.user?.id) ?? null

  const { data, isLoading, isError, refetch } = useTeamMembers(tenantId, { page, limit: 50 })

  const members = data?.items ?? []
  const meta = data?.meta

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cài đặt"
        description="Mời và quản lý thành viên workspace"
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-1.5 size-4" />
            Mời thành viên
          </Button>
        }
      />
      <SettingsTabs />

      {isLoading && <LoadingSkeleton variant="table" />}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && members.length === 0 && (
        <EmptyState
          icon={Users}
          title="Chưa có thành viên"
          description="Mời thành viên để cùng quản lý workspace"
        >
          <Button className="mt-4" onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-1.5 size-4" />
            Mời thành viên
          </Button>
        </EmptyState>
      )}

      {!isLoading && !isError && members.length > 0 && (
        <>
          <TeamMembersTable
            members={members}
            tenantId={tenantId!}
            currentUserId={currentUserId}
          />
          {meta && (
            <DataTablePagination meta={meta} onPageChange={setPage} />
          )}
        </>
      )}

      {tenantId && (
        <InviteMemberDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          tenantId={tenantId}
          currentMemberCount={meta?.total ?? 0}
        />
      )}
    </div>
  )
}
