"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { tenantsApi } from "@/lib/api/tenants-api"
import type { UserRole } from "@/lib/stores/auth-store"
import type { ListParams } from "@/lib/types/api-responses"
import { handleMutationError } from "@/lib/utils/handle-mutation-error"

export function useTeamMembers(tenantId: string | null, params?: ListParams) {
  return useQuery({
    queryKey: ["tenants", tenantId, "members", params],
    queryFn: () => tenantsApi.getMembers(tenantId!, params),
    enabled: !!tenantId,
    staleTime: 60_000,
  })
}

export function useInviteMember(tenantId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: UserRole }) => {
      if (!tenantId) throw new Error("tenantId is required")
      return tenantsApi.inviteMember(tenantId, email, role)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants", tenantId, "members"] })
      toast.success("Đã gửi lời mời")
    },
    onError: handleMutationError,
  })
}

export function useUpdateMemberRole(tenantId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) => {
      if (!tenantId) throw new Error("tenantId is required")
      return tenantsApi.updateMemberRole(tenantId, userId, role)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants", tenantId, "members"] })
      toast.success("Đã cập nhật vai trò")
    },
    onError: handleMutationError,
  })
}

export function useRemoveMember(tenantId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId }: { userId: string }) => {
      if (!tenantId) throw new Error("tenantId is required")
      return tenantsApi.removeMember(tenantId, userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants", tenantId, "members"] })
      toast.success("Đã xóa thành viên")
    },
    onError: handleMutationError,
  })
}
