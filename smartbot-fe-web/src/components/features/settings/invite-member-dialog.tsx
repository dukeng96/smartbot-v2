"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { QuotaWarning } from "@/components/shared/quota-warning"
import { inviteMemberSchema, type InviteMemberFormData } from "@/lib/validations/settings-schemas"
import { useInviteMember } from "@/lib/hooks/use-team"
import type { UserRole } from "@/lib/stores/auth-store"

interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  currentMemberCount?: number
  memberLimit?: number
}

const ROLE_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Quản lý toàn bộ workspace" },
  { value: "member", label: "Member", description: "Tạo và quản lý nội dung" },
  { value: "viewer", label: "Viewer", description: "Chỉ xem, không chỉnh sửa" },
]

/**
 * Invite member dialog — email + role dropdown.
 * Shows quota warning if at member limit.
 */
export function InviteMemberDialog({
  open,
  onOpenChange,
  tenantId,
  currentMemberCount = 0,
  memberLimit = 0,
}: InviteMemberDialogProps) {
  const inviteMember = useInviteMember(tenantId)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InviteMemberFormData>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "", role: "member" },
  })

  const selectedRole = watch("role")
  const atLimit = memberLimit > 0 && currentMemberCount >= memberLimit

  const onSubmit = (data: InviteMemberFormData) => {
    inviteMember.mutate(
      { email: data.email, role: data.role as UserRole },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Mời thành viên</DialogTitle>
          <DialogDescription>
            Gửi lời mời qua email để tham gia workspace
          </DialogDescription>
        </DialogHeader>

        {atLimit && (
          <QuotaWarning
            current={currentMemberCount}
            max={memberLimit}
            entityLabel="thành viên"
          />
        )}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-[#374151]">Email</label>
            <Input
              type="email"
              placeholder="email@company.com"
              {...register("email")}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-[12px] text-[#DC2626]">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-[#374151]">Vai trò</label>
            <Select
              value={selectedRole}
              onValueChange={(v) => setValue("role", v as InviteMemberFormData["role"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span>{opt.label}</span>
                    <span className="ml-2 text-[12px] text-text-muted">{opt.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-[12px] text-[#DC2626]">{errors.role.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={inviteMember.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={inviteMember.isPending || atLimit}>
              {inviteMember.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Gửi lời mời
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
