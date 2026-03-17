import type { User } from "@/lib/types/user"

import { apiGet, apiPatch, apiPost } from "./client"

export interface UpdateMePayload {
  fullName?: string
  phone?: string | null
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export const usersApi = {
  getMe: () =>
    apiGet<User>("api/v1/users/me"),

  updateMe: (data: UpdateMePayload) =>
    apiPatch<User>("api/v1/users/me", data),

  changePassword: (data: ChangePasswordPayload) =>
    apiPost<void>("api/v1/auth/change-password", data),
}
