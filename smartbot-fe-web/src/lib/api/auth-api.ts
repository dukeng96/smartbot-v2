import type { AuthUser, AuthTenant, UserRole } from "@/lib/stores/auth-store"

import { apiPost } from "./client"

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
  tenant: AuthTenant
  role: UserRole
}

export interface RegisterResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
  tenant: AuthTenant
  role: UserRole
}

export const authApi = {
  login: (email: string, password: string) =>
    apiPost<LoginResponse>("api/v1/auth/login", { email, password }),

  register: (fullName: string, email: string, password: string) =>
    apiPost<RegisterResponse>("api/v1/auth/register", { fullName, email, password }),

  logout: (refreshToken: string) =>
    apiPost<void>("api/v1/auth/logout", { refreshToken }),

  forgotPassword: (email: string) =>
    apiPost<void>("api/v1/auth/forgot-password", { email }),

  resetPassword: (token: string, password: string) =>
    apiPost<void>("api/v1/auth/reset-password", { token, password }),

  verifyEmail: (token: string) =>
    apiPost<void>("api/v1/auth/verify-email", { token }),

  googleOAuth: (credential: string) =>
    apiPost<LoginResponse>("api/v1/auth/oauth/google", { credential }),
}
