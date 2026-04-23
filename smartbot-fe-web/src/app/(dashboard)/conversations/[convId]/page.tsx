"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { ChatThread } from "@/components/features/conversations/chat-thread"
import { ConversationDetailMetadata } from "@/components/features/conversations/conversation-detail-metadata"
import {
  useConversation,
  useMessages,
  useMessageFeedback,
} from "@/lib/hooks/use-conversations"

/**
 * E2 — Conversation detail page.
 * Two-column: chat thread (left 68%) + metadata panel (right 32%).
 * Read-only operational view.
 */
export default function ConversationDetailPage() {
  const { convId } = useParams<{ convId: string }>()

  const {
    data: conversation,
    isLoading: convLoading,
    isError: convError,
    refetch: refetchConv,
  } = useConversation(convId)

  const {
    data: messagesData,
    isLoading: msgsLoading,
    isError: msgsError,
    refetch: refetchMsgs,
  } = useMessages(convId, { limit: 200 })

  const feedback = useMessageFeedback()

  const isLoading = convLoading || msgsLoading
  const isError = convError || msgsError

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumb />
        <LoadingSkeleton variant="detail" rows={8} />
      </div>
    )
  }

  if (isError || !conversation) {
    return (
      <div className="space-y-6">
        <Breadcrumb />
        <ErrorState
          onRetry={() => {
            refetchConv()
            refetchMsgs()
          }}
        />
      </div>
    )
  }

  const messages = messagesData?.items ?? []

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="grid grid-cols-[68fr_32fr] gap-6" style={{ minHeight: "calc(100vh - 200px)" }}>
        <ChatThread
          conversation={conversation}
          messages={messages}
          onFeedback={(vars) => feedback.mutate(vars)}
        />
        <ConversationDetailMetadata
          conversation={conversation}
          messages={messages}
        />
      </div>
    </div>
  )
}

/** Breadcrumb back link */
function Breadcrumb() {
  return (
    <Link
      href="/conversations"
      className="inline-flex items-center gap-1.5 rounded-[8px] px-3 h-8 text-xs font-semibold text-text-secondary hover:bg-primary-light transition-all"
    >
      <ArrowLeft className="size-4" />
      Cuộc hội thoại
    </Link>
  )
}
