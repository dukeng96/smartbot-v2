"use client"

import { useEffect, useState, type ReactNode } from "react"

import { getRefreshToken, refreshSession } from "@/lib/api/client"
import { useAuthStore } from "@/lib/stores/auth-store"
import type { AuthUser, AuthTenant, UserRole } from "@/lib/stores/auth-store"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    const restore = async () => {
      const storedRefresh = getRefreshToken()
      if (!storedRefresh) {
        setHydrated(true)
        return
      }

      try {
        const result = await refreshSession()
        if (result) {
          setAuth(
            result.user as unknown as AuthUser,
            result.tenant as unknown as AuthTenant,
            result.role as UserRole,
            result.accessToken,
            result.refreshToken,
          )
        }
      } catch {
        // Session expired or invalid — continue as unauthenticated
      }

      setHydrated(true)
    }

    restore()
  }, [setAuth])

  if (!hydrated) {
    return null
  }

  return <>{children}</>
}
