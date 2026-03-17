"use client"

import { useQuery } from "@tanstack/react-query"

import { fetchBots, fetchBot } from "@/lib/api/bots-api"
import type { ListParams } from "@/lib/types/api-responses"

/** Paginated bot list — used by bot selector and bot list page */
export function useBots(params?: ListParams) {
  return useQuery({
    queryKey: ["bots", params],
    queryFn: () => fetchBots(params),
    staleTime: 30_000,
  })
}

/** Single bot detail */
export function useBot(botId: string | undefined) {
  return useQuery({
    queryKey: ["bots", botId],
    queryFn: () => fetchBot(botId!),
    enabled: !!botId,
    staleTime: 5 * 60_000,
  })
}
