/**
 * Analytics API response types.
 * Maps to GET /api/v1/analytics/* endpoints.
 */

export interface AnalyticsOverview {
  totalConversationsToday: number
  totalMessagesToday: number
  creditsUsed: number
  creditsRemaining: number
  activeBots: number
  totalDocuments: number
}

export interface ConversationDataPoint {
  date: string
  count: number
  avgMessages: number
  avgResponseTimeMs: number
}

export interface MessageDataPoint {
  date: string
  count: number
  userMessages: number
  assistantMessages: number
}

export interface CreditDataPoint {
  date: string
  creditsUsed: number
}

export interface ChannelBreakdown {
  channel: string
  conversations: number
  messages: number
}

export interface TopQuestion {
  question_prefix: string
  count: number
  sample: string
}

export interface SatisfactionData {
  distribution: Record<string, number>
  totalRatings: number
  avgRating: number
}

export interface AnalyticsFilterParams {
  period?: string
  botId?: string
}
