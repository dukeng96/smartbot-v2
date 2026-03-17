import type { Conversation } from "@/lib/types/conversation"
import type { Message } from "@/lib/types/message"
import type { PaginatedResponse, ListParams } from "@/lib/types/api-responses"
import { apiGet, apiPost, apiDelete } from "./client"

/** Params for listing conversations */
export interface ConversationListParams extends ListParams {
  channel?: string
  status?: string
}

/** List conversations — optionally filtered by bot */
export function listConversations(
  botId?: string,
  params?: ConversationListParams,
) {
  const url = botId
    ? `api/v1/bots/${botId}/conversations`
    : "api/v1/conversations"
  return apiGet<PaginatedResponse<Conversation>>(url, params as Record<string, string>)
}

/** Get a single conversation by ID */
export function getConversation(convId: string) {
  return apiGet<Conversation>(`api/v1/conversations/${convId}`)
}

/** List messages for a conversation */
export function getConversationMessages(
  convId: string,
  params?: ListParams,
) {
  return apiGet<PaginatedResponse<Message>>(
    `api/v1/conversations/${convId}/messages`,
    params as Record<string, string>,
  )
}

/** Archive (soft-delete) a conversation */
export function archiveConversation(convId: string) {
  return apiDelete(`api/v1/conversations/${convId}`)
}

/** Rate a conversation */
export function rateConversation(
  convId: string,
  data: { rating: number; feedbackText?: string },
) {
  return apiPost(`api/v1/conversations/${convId}/rating`, data)
}

/** Submit feedback on a single message */
export function submitMessageFeedback(
  msgId: string,
  feedback: "thumbs_up" | "thumbs_down",
) {
  return apiPost(`api/v1/messages/${msgId}/feedback`, { feedback })
}
