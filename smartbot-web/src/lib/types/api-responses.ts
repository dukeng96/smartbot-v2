/**
 * Standard API response envelope from genai-platform-api.
 * All backend endpoints return this shape.
 */
export interface ApiResponse<T> {
  statusCode: number
  message: string
  data: T
}

/**
 * Paginated list response — returned by list endpoints.
 */
export interface PaginatedResponse<T> {
  items: T[]
  meta: PaginationMeta
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Normalized error shape thrown by the API client.
 */
export interface ApiError {
  statusCode: number
  message: string
  error?: string
}

/**
 * Common list query params used across all list endpoints.
 */
export interface ListParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
}
