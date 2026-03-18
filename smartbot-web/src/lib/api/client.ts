import ky, { type KyInstance, type NormalizedOptions } from "ky"

import type { ApiResponse } from "@/lib/types/api-responses"

const REFRESH_TOKEN_KEY = "sb_refresh_token"
const SESSION_COOKIE_NAME = "sb_authenticated"

let accessToken: string | null = null
let refreshPromise: Promise<RefreshResult | null> | null = null

interface RefreshResult {
  accessToken: string
  refreshToken: string
  user: Record<string, unknown>
  tenant: Record<string, unknown>
  role: string
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

export function setRefreshToken(token: string | null) {
  if (typeof window === "undefined") return
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
    document.cookie = `${SESSION_COOKIE_NAME}=1; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

async function attachAccessToken(request: Request) {
  if (accessToken) {
    request.headers.set("Authorization", `Bearer ${accessToken}`)
  }
}

async function doRefreshSession(): Promise<RefreshResult | null> {
  const storedRefresh = getRefreshToken()
  if (!storedRefresh) return null
  try {
    const res = await ky
      .post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`, {
        json: { refreshToken: storedRefresh },
      })
      .json<ApiResponse<RefreshResult>>()
    setAccessToken(res.data.accessToken)
    setRefreshToken(res.data.refreshToken)
    return res.data
  } catch {
    setAccessToken(null)
    setRefreshToken(null)
    return null
  }
}

/** Refresh the session, deduplicating concurrent calls. */
export async function refreshSession(): Promise<RefreshResult | null> {
  if (!refreshPromise) {
    refreshPromise = doRefreshSession().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function handleTokenRefresh(
  request: Request,
  _options: NormalizedOptions,
  response: Response
) {
  if (response.status !== 401) return response

  const result = await refreshSession()
  if (!result) {
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
    return response
  }

  // Retry original request with new token
  request.headers.set("Authorization", `Bearer ${result.accessToken}`)
  return ky(request)
}

export const apiClient: KyInstance = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
  credentials: "include",
  hooks: {
    beforeRequest: [attachAccessToken],
    afterResponse: [handleTokenRefresh],
  },
})

/**
 * Typed GET helper — unwraps API envelope to return `data` directly.
 */
export async function apiGet<T>(url: string, searchParams?: Record<string, string | number | boolean | undefined>): Promise<T> {
  // Filter out undefined params
  const filtered = searchParams
    ? Object.fromEntries(Object.entries(searchParams).filter(([, v]) => v !== undefined))
    : undefined
  const res = await apiClient.get(url, { searchParams: filtered as Record<string, string> }).json<ApiResponse<T>>()
  return res.data
}

/**
 * Typed POST helper. Handles 204 No Content gracefully.
 */
export async function apiPost<T>(url: string, json?: unknown): Promise<T> {
  const response = await apiClient.post(url, { json })
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T
  }
  const res = await response.json<ApiResponse<T>>()
  return res.data
}

/**
 * Typed PATCH helper.
 */
export async function apiPatch<T>(url: string, json?: unknown): Promise<T> {
  const res = await apiClient.patch(url, { json }).json<ApiResponse<T>>()
  return res.data
}

/**
 * Typed DELETE helper. Handles 204 No Content gracefully.
 */
export async function apiDelete<T = void>(url: string): Promise<T> {
  const response = await apiClient.delete(url)
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T
  }
  const res = await response.json<ApiResponse<T>>()
  return res.data
}
