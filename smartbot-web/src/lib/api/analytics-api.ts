import { apiGet } from "@/lib/api/client"
import type {
  AnalyticsOverview,
  ConversationDataPoint,
  MessageDataPoint,
  CreditDataPoint,
  ChannelBreakdown,
  TopQuestion,
  SatisfactionData,
  AnalyticsFilterParams,
} from "@/lib/types/analytics"

/**
 * Analytics API functions — maps to GET /api/v1/analytics/* endpoints.
 */

export function fetchAnalyticsOverview() {
  return apiGet<AnalyticsOverview>("api/v1/analytics/overview")
}

export function fetchConversationAnalytics(params: AnalyticsFilterParams) {
  return apiGet<ConversationDataPoint[]>("api/v1/analytics/conversations", {
    period: params.period,
    botId: params.botId,
  })
}

export function fetchMessageAnalytics(params: AnalyticsFilterParams) {
  return apiGet<MessageDataPoint[]>("api/v1/analytics/messages", {
    period: params.period,
    botId: params.botId,
  })
}

export function fetchCreditAnalytics(period?: string) {
  return apiGet<CreditDataPoint[]>("api/v1/analytics/credits", { period })
}

export function fetchChannelAnalytics(period?: string) {
  return apiGet<ChannelBreakdown[]>("api/v1/analytics/channels", { period })
}

export function fetchTopQuestions(botId: string, limit = 20) {
  return apiGet<TopQuestion[]>(`api/v1/analytics/bots/${botId}/top-questions`, { limit })
}

export function fetchSatisfaction(botId: string) {
  return apiGet<SatisfactionData>(`api/v1/analytics/bots/${botId}/satisfaction`)
}
