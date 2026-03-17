"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TenantMember } from "@/lib/types/tenant"
import type { UserRole } from "@/lib/stores/auth-store"

interface RoleChangeDialogProps {
  member: TenantMember
  isPending: boolean
  onConfirm: (role: UserRole) => void
  onClose: () => void
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
]

/**
 * Dialog to change a team member's role.
 */
export function RoleChangeDialog({ member, isPending, onConfirm, onClose }: RoleChangeDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(member.role)

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Đổi vai trò</DialogTitle>
          <DialogDescription>
            Thay đổi vai trò của {member.user.fullName ?? member.user.email}
          </DialogDescription>
        </DialogHeader>

        <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
          <SelectTrigger>
            <SelectValue placeholder="Chọn vai trò" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Hủy
          </Button>
          <Button
            onClick={() => onConfirm(selectedRole)}
            disabled={isPending || selectedRole === member.role}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
