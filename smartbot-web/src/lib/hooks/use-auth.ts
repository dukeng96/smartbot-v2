"use client"

import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { authApi } from "@/lib/api/auth-api"
import { useAuthStore } from "@/lib/stores/auth-store"
import { handleMutationError } from "@/lib/utils/handle-mutation-error"

export function useLogin() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (data) => {
      setAuth(data.user, data.tenant, data.role, data.accessToken)
      router.push("/")
    },
    onError: handleMutationError,
  })
}

export function useRegister() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: ({ fullName, email, password }: { fullName: string; email: string; password: string }) =>
      authApi.register(fullName, email, password),
    onSuccess: (data) => {
      setAuth(data.user, data.tenant, data.role, data.accessToken)
      router.push("/")
    },
    onError: handleMutationError,
  })
}

export function useLogout() {
  const router = useRouter()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      clearAuth()
      router.push("/login")
    },
    onError: () => {
      // Even on error, clear auth and redirect
      clearAuth()
      router.push("/login")
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: ({ email }: { email: string }) =>
      authApi.forgotPassword(email),
    onSuccess: () => {
      toast.success("Email đã được gửi", {
        description: "Vui lòng kiểm tra hộp thư để đặt lại mật khẩu",
      })
    },
    onError: handleMutationError,
  })
}

export function useResetPassword() {
  const router = useRouter()

  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authApi.resetPassword(token, password),
    onSuccess: () => {
      toast.success("Mật khẩu đã được đặt lại")
      router.push("/login")
    },
    onError: handleMutationError,
  })
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: ({ token }: { token: string }) =>
      authApi.verifyEmail(token),
    onError: handleMutationError,
  })
}
