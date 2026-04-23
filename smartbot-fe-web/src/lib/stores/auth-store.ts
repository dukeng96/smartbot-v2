"use client"

import { create } from "zustand"

import { setAccessToken, setRefreshToken } from "@/lib/api/client"

export interface AuthUser {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  phone: string | null
  emailVerified: boolean
  authProvider: "email" | "google"
}

export interface AuthTenant {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  planId: string | null
}

export type UserRole = "owner" | "admin" | "member" | "viewer"

interface AuthState {
  user: AuthUser | null
  tenant: AuthTenant | null
  role: UserRole | null
  isAuthenticated: boolean
}

interface AuthActions {
  setAuth: (user: AuthUser, tenant: AuthTenant, role: UserRole, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  updateUser: (partial: Partial<AuthUser>) => void
  updateTenant: (partial: Partial<AuthTenant>) => void
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  tenant: null,
  role: null,
  isAuthenticated: false,

  setAuth: (user, tenant, role, accessToken, refreshToken) => {
    setAccessToken(accessToken)
    setRefreshToken(refreshToken)
    set({ user, tenant, role, isAuthenticated: true })
  },

  clearAuth: () => {
    setAccessToken(null)
    setRefreshToken(null)
    set({ user: null, tenant: null, role: null, isAuthenticated: false })
  },

  updateUser: (partial) => {
    const current = get().user
    if (!current) return
    set({ user: { ...current, ...partial } })
  },

  updateTenant: (partial) => {
    const current = get().tenant
    if (!current) return
    set({ tenant: { ...current, ...partial } })
  },
}))
