"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { usersApi, type UpdateMePayload, type ChangePasswordPayload } from "@/lib/api/users-api"
import { useAuthStore } from "@/lib/stores/auth-store"
import { handleMutationError } from "@/lib/utils/handle-mutation-error"

export function useCurrentUser() {
  return useQuery({
    queryKey: ["user", "me"],
    queryFn: () => usersApi.getMe(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const updateUser = useAuthStore((s) => s.updateUser)

  return useMutation({
    mutationFn: (data: UpdateMePayload) => usersApi.updateMe(data),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["user", "me"] })
      updateUser({
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
      })
      toast.success("Lưu thành công")
    },
    onError: handleMutationError,
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordPayload) => usersApi.changePassword(data),
    onSuccess: () => {
      toast.success("Mật khẩu đã được thay đổi")
    },
    onError: handleMutationError,
  })
}
