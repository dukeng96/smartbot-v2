"use client"

import { useQuery } from "@tanstack/react-query"

import {
  fetchAnalyticsOverview,
  fetchConversationAnalytics,
  fetchMessageAnalytics,
  fetchCreditAnalytics,
  fetchChannelAnalytics,
  fetchTopQuestions,
  fetchSatisfaction,
} from "@/lib/api/analytics-api"
import type { AnalyticsFilterParams } from "@/lib/types/analytics"

/** Dashboard overview KPIs — stale after 30s */
export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: fetchAnalyticsOverview,
    staleTime: 30_000,
  })
}

/** Conversation trend data — by period and optional botId */
export function useConversationAnalytics(params: AnalyticsFilterParams) {
  return useQuery({
    queryKey: ["analytics", "conversations", params],
    queryFn: () => fetchConversationAnalytics(params),
    staleTime: 30_000,
  })
}

/** Message trend data — by period and optional botId */
export function useMessageAnalytics(params: AnalyticsFilterParams) {
  return useQuery({
    queryKey: ["analytics", "messages", params],
    queryFn: () => fetchMessageAnalytics(params),
    staleTime: 30_000,
  })
}

/** Credit usage over time */
export function useCreditAnalytics(period?: string) {
  return useQuery({
    queryKey: ["analytics", "credits", { period }],
    queryFn: () => fetchCreditAnalytics(period),
    staleTime: 30_000,
  })
}

/** Channel breakdown — conversations/messages per channel */
export function useChannelAnalytics(period?: string) {
  return useQuery({
    queryKey: ["analytics", "channels", { period }],
    queryFn: () => fetchChannelAnalytics(period),
    staleTime: 30_000,
  })
}

/** Top questions for a specific bot */
export function useTopQuestions(botId: string | undefined) {
  return useQuery({
    queryKey: ["analytics", "top-questions", botId],
    queryFn: () => fetchTopQuestions(botId!),
    enabled: !!botId,
    staleTime: 60_000,
  })
}

/** Satisfaction ratings for a specific bot */
export function useSatisfaction(botId: string | undefined) {
  return useQuery({
    queryKey: ["analytics", "satisfaction", botId],
    queryFn: () => fetchSatisfaction(botId!),
    enabled: !!botId,
    staleTime: 60_000,
  })
}
