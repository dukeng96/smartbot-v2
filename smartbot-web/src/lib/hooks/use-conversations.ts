"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import type { ConversationListParams } from "@/lib/api/conversations-api"
import type { ListParams } from "@/lib/types/api-responses"
import {
  listConversations,
  getConversation,
  getConversationMessages,
  archiveConversation,
  rateConversation,
  submitMessageFeedback,
} from "@/lib/api/conversations-api"

/** Paginated conversation list */
export function useConversations(
  botId?: string,
  params?: ConversationListParams,
) {
  return useQuery({
    queryKey: ["conversations", botId, params],
    queryFn: () => listConversations(botId, params),
  })
}

/** Single conversation detail */
export function useConversation(convId: string) {
  return useQuery({
    queryKey: ["conversations", convId],
    queryFn: () => getConversation(convId),
    enabled: !!convId,
  })
}

/** Messages for a conversation */
export function useMessages(convId: string, params?: ListParams) {
  return useQuery({
    queryKey: ["conversations", convId, "messages", params],
    queryFn: () => getConversationMessages(convId, params),
    enabled: !!convId,
  })
}

/** Archive conversation mutation */
export function useArchiveConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (convId: string) => archiveConversation(convId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] })
    },
  })
}

/** Rate conversation mutation */
export function useRateConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      convId: string
      rating: number
      feedbackText?: string
    }) => rateConversation(vars.convId, vars),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["conversations", vars.convId] })
    },
  })
}

/** Message feedback mutation (thumbs up/down) */
export function useMessageFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      msgId: string
      convId: string
      feedback: "thumbs_up" | "thumbs_down"
    }) => submitMessageFeedback(vars.msgId, vars.feedback),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ["conversations", vars.convId, "messages"],
      })
    },
  })
}
