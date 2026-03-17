"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/shared/status-badge"
import { workspaceSchema, type WorkspaceFormData } from "@/lib/validations/settings-schemas"
import { useAuthStore } from "@/lib/stores/auth-store"
import { tenantsApi } from "@/lib/api/tenants-api"
import { handleMutationError } from "@/lib/utils/handle-mutation-error"
import type { Tenant } from "@/lib/types/tenant"

interface WorkspaceFormProps {
  tenant: Tenant
}

/**
 * Workspace settings form — name (editable), slug (read-only mono),
 * logo upload area, plan badge, status badge.
 */
export function WorkspaceForm({ tenant }: WorkspaceFormProps) {
  const queryClient = useQueryClient()
  const updateTenantStore = useAuthStore((s) => s.updateTenant)

  const updateMutation = useMutation({
    mutationFn: (data: WorkspaceFormData) =>
      tenantsApi.updateTenant(tenant.id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["tenants", tenant.id] })
      updateTenantStore({ name: updated.name })
      toast.success("Lưu thành công")
    },
    onError: handleMutationError,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<WorkspaceFormData>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: tenant.name },
  })

  useEffect(() => {
    reset({ name: tenant.name })
  }, [tenant, reset])

  const onSubmit = (data: WorkspaceFormData) => {
    updateMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-[#374151]">Tên workspace</label>
          <Input
            {...register("name")}
            placeholder="Nhập tên workspace"
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p className="text-[12px] text-[#DC2626]">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-[#374151]">Slug</label>
          <Input
            value={tenant.slug}
            disabled
            className="bg-muted font-mono text-[13px]"
          />
          <p className="text-[12px] text-text-muted">Định danh workspace, không thể thay đổi</p>
        </div>

        {/* Logo upload area placeholder */}
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-[#374151]">Logo</label>
          <div className="flex size-20 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted">
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt="Workspace logo"
                className="size-full rounded-xl object-cover"
              />
            ) : (
              <span className="text-2xl font-semibold text-text-muted">
                {tenant.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Plan + Status info */}
        <div className="flex items-center gap-4">
          {tenant.planId && (
            <Link href="/billing" className="text-[13px] font-medium text-primary hover:underline">
              Xem gói hiện tại
            </Link>
          )}
          <StatusBadge
            status={
              tenant.status === "active" ? "active"
                : tenant.status === "suspended" ? "paused"
                : "error"
            }
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty || updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </div>
  )
}
