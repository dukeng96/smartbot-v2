"use client"

import { Clock, MessageSquare, Star, Zap } from "lucide-react"

import type { Conversation } from "@/lib/types/conversation"
import type { Message } from "@/lib/types/message"
import { CHANNEL_LABELS } from "@/lib/types/conversation"
import { formatRelativeTime } from "@/lib/utils/format-date"

interface ConversationDetailMetadataProps {
  conversation: Conversation
  messages: Message[]
}

/** Calculate average response time from assistant messages */
function avgResponseTime(messages: Message[]): string {
  const assistantMsgs = messages.filter(
    (m) => m.role === "assistant" && m.responseTimeMs != null,
  )
  if (assistantMsgs.length === 0) return "—"
  const avg =
    assistantMsgs.reduce((sum, m) => sum + (m.responseTimeMs ?? 0), 0) /
    assistantMsgs.length
  return avg < 1000
    ? `${Math.round(avg)}ms`
    : `${(avg / 1000).toFixed(1)}s`
}

/** Calculate conversation duration */
function duration(conv: Conversation): string {
  const start = new Date(conv.createdAt).getTime()
  const end = new Date(conv.lastMessageAt).getTime()
  const diff = end - start
  if (diff < 60_000) return "< 1 phút"
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} phút`
  return `${(diff / 3_600_000).toFixed(1)} giờ`
}

/**
 * Right-column metadata panel for conversation detail (E2).
 * Cards: User Info, Metrics, Feedback.
 */
export function ConversationDetailMetadata({
  conversation,
  messages,
}: ConversationDetailMetadataProps) {
  return (
    <div className="space-y-4">
      {/* User Info card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-[13px] font-semibold text-foreground mb-3">
          Thông tin người dùng
        </h3>
        <dl className="space-y-2 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-text-muted">Tên</dt>
            <dd className="text-text-body font-medium">
              {conversation.endUserName ?? "Ẩn danh"}
            </dd>
          </div>
          {conversation.endUserEmail && (
            <div className="flex justify-between">
              <dt className="text-text-muted">Email</dt>
              <dd className="text-text-body truncate ml-4">
                {conversation.endUserEmail}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-text-muted">Kênh</dt>
            <dd className="text-text-body">
              {CHANNEL_LABELS[conversation.channel]}
            </dd>
          </div>
          {conversation.endUserMetadata &&
            Object.keys(conversation.endUserMetadata).length > 0 && (
              <div className="pt-1 border-t border-border-light">
                <dt className="text-text-muted mb-1">Metadata</dt>
                <dd className="text-[12px] text-text-secondary bg-[#F9FAFB] rounded-lg p-2 font-mono break-all">
                  {JSON.stringify(conversation.endUserMetadata, null, 2)}
                </dd>
              </div>
            )}
        </dl>
      </div>

      {/* Metrics card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-[13px] font-semibold text-foreground mb-3">
          Chỉ số
        </h3>
        <div className="space-y-2.5">
          <MetricRow
            icon={MessageSquare}
            label="Tin nhắn"
            value={String(conversation.messageCount)}
          />
          <MetricRow
            icon={Clock}
            label="Thời lượng"
            value={duration(conversation)}
          />
          <MetricRow
            icon={Zap}
            label="TB phản hồi"
            value={avgResponseTime(messages)}
          />
        </div>
      </div>

      {/* Feedback card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-[13px] font-semibold text-foreground mb-3">
          Đánh giá
        </h3>
        {conversation.rating ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`size-4 ${
                    i < (conversation.rating ?? 0)
                      ? "fill-[#F59E0B] text-[#F59E0B]"
                      : "text-[#E5E7EB]"
                  }`}
                />
              ))}
              <span className="ml-1 text-[13px] text-text-secondary">
                {conversation.rating}/5
              </span>
            </div>
            {conversation.feedbackText && (
              <p className="text-[13px] text-text-body italic">
                &ldquo;{conversation.feedbackText}&rdquo;
              </p>
            )}
          </div>
        ) : (
          <p className="text-[13px] text-text-muted">Chưa có đánh giá</p>
        )}
      </div>
    </div>
  )
}

/** Small metric row with icon */
function MetricRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <div className="flex items-center gap-2 text-text-muted">
        <Icon className="size-3.5" />
        <span>{label}</span>
      </div>
      <span className="font-medium text-text-body tabular-nums">{value}</span>
    </div>
  )
}
