import { apiGet } from "@/lib/api/client"
import type { PaginatedResponse, ListParams } from "@/lib/types/api-responses"
import type { Bot } from "@/lib/types/bot"

/**
 * Bot API functions — minimal set needed for analytics bot selector.
 * Will be extended when bot CRUD pages are implemented.
 */

export function fetchBots(params?: ListParams) {
  return apiGet<PaginatedResponse<Bot>>("api/v1/bots", {
    page: params?.page,
    limit: params?.limit,
    search: params?.search,
    sortBy: params?.sortBy,
    sortOrder: params?.sortOrder,
  })
}

export function fetchBot(botId: string) {
  return apiGet<Bot>(`api/v1/bots/${botId}`)
}
