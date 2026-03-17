import ky, { type KyInstance, type NormalizedOptions } from "ky"

import type { ApiResponse } from "@/lib/types/api-responses"

let accessToken: string | null = null
let refreshPromise: Promise<string | null> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

async function attachAccessToken(request: Request) {
  if (accessToken) {
    request.headers.set("Authorization", `Bearer ${accessToken}`)
  }
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await ky
      .post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`, {
        credentials: "include",
      })
      .json<ApiResponse<{ accessToken: string }>>()
    const newToken = res.data.accessToken
    setAccessToken(newToken)
    return newToken
  } catch {
    setAccessToken(null)
    return null
  }
}

async function handleTokenRefresh(
  request: Request,
  _options: NormalizedOptions,
  response: Response
) {
  if (response.status !== 401) return response

  // Deduplicate concurrent refresh calls
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null
    })
  }

  const newToken = await refreshPromise
  if (!newToken) {
    // Refresh failed — redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
    return response
  }

  // Retry original request with new token
  request.headers.set("Authorization", `Bearer ${newToken}`)
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
