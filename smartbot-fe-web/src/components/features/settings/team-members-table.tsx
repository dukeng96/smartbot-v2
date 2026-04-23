"use client"

import { useState } from "react"
import { MoreVertical } from "lucide-react"

import { DataTable, type DataTableColumn } from "@/components/shared/data-table"
import { StatusBadge, type StatusVariant } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { useUpdateMemberRole, useRemoveMember } from "@/lib/hooks/use-team"
import type { TenantMember } from "@/lib/types/tenant"
import type { UserRole } from "@/lib/stores/auth-store"
import { formatDate } from "@/lib/utils/format-date"

import { RoleChangeDialog } from "./role-change-dialog"

interface TeamMembersTableProps {
  members: TenantMember[]
  tenantId: string
  currentUserId: string | null
}

const ROLE_BADGE: Record<string, { variant: StatusVariant; label: string }> = {
  owner: { variant: "subscription", label: "Owner" },
  admin: { variant: "active", label: "Admin" },
  member: { variant: "processing", label: "Member" },
  viewer: { variant: "draft", label: "Viewer" },
}

/**
 * Team members data table — name+avatar, email, role badge, status, joined date, actions.
 */
export function TeamMembersTable({ members, tenantId, currentUserId }: TeamMembersTableProps) {
  const [roleDialog, setRoleDialog] = useState<{ member: TenantMember } | null>(null)
  const [removeDialog, setRemoveDialog] = useState<{ member: TenantMember } | null>(null)
  const updateRole = useUpdateMemberRole(tenantId)
  const removeMember = useRemoveMember(tenantId)

  const columns: DataTableColumn<TenantMember>[] = [
    {
      key: "name",
      header: "Thành viên",
      cell: (row) => (
        <div className="flex items-center gap-3">
          {row.user.avatarUrl ? (
            <img src={row.user.avatarUrl} alt="" className="size-8 rounded-full object-cover" />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full bg-primary-light">
              <span className="text-[12px] font-semibold text-primary">
                {(row.user.fullName ?? row.user.email).charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-[13px] font-medium text-foreground">
            {row.user.fullName ?? "—"}
          </span>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      cell: (row) => row.user.email,
    },
    {
      key: "role",
      header: "Vai trò",
      cell: (row) => {
        const badge = ROLE_BADGE[row.role] ?? ROLE_BADGE.member
        return <StatusBadge status={badge.variant} label={badge.label} />
      },
    },
    {
      key: "status",
      header: "Trạng thái",
      cell: (row) => (
        <StatusBadge status={row.status as StatusVariant} />
      ),
    },
    {
      key: "joinedAt",
      header: "Ngày tham gia",
      cell: (row) => formatDate(row.joinedAt),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (row) => {
        // Don't show actions for owner or for the current user
        if (row.role === "owner" || row.userId === currentUserId) return null
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="sm" className="size-8 p-0" aria-label="Tùy chọn" />}
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRoleDialog({ member: row })}>
                Đổi vai trò
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setRemoveDialog({ member: row })}
              >
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <>
      <DataTable columns={columns} data={members} rowKey={(row) => row.id} />

      {/* Role change dialog */}
      {roleDialog && (
        <RoleChangeDialog
          member={roleDialog.member}
          isPending={updateRole.isPending}
          onConfirm={(role: UserRole) => {
            updateRole.mutate(
              { userId: roleDialog.member.userId, role },
              { onSuccess: () => setRoleDialog(null) },
            )
          }}
          onClose={() => setRoleDialog(null)}
        />
      )}

      {/* Remove confirmation dialog */}
      {removeDialog && (
        <ConfirmDialog
          open
          onOpenChange={(open) => { if (!open) setRemoveDialog(null) }}
          title={`Xóa ${removeDialog.member.user.fullName ?? removeDialog.member.user.email}?`}
          message="Bạn có chắc muốn xóa thành viên này? Hành động này không thể hoàn tác."
          confirmLabel="Xóa"
          variant="destructive"
          loading={removeMember.isPending}
          onConfirm={() => {
            removeMember.mutate(
              { userId: removeDialog.member.userId },
              { onSuccess: () => setRemoveDialog(null) },
            )
          }}
        />
      )}
    </>
  )
}
