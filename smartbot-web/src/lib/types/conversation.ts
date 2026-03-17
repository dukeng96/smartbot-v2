/**
 * Conversation entity — represents a chat session between
 * an end-user and an assistant bot.
 */
export interface Conversation {
  id: string
  botId: string
  endUserId: string
  endUserName: string | null
  endUserEmail: string | null
  endUserMetadata: Record<string, unknown> | null
  channel: ConversationChannel
  status: ConversationStatus
  messageCount: number
  lastMessageAt: string
  rating: number | null
  feedbackText: string | null
  createdAt: string
  updatedAt: string
}

export type ConversationChannel =
  | "web_widget"
  | "facebook_messenger"
  | "telegram"
  | "zalo"
  | "api"

export type ConversationStatus = "active" | "closed" | "archived"

/** Channel display labels (Vietnamese) */
export const CHANNEL_LABELS: Record<ConversationChannel, string> = {
  web_widget: "Web Widget",
  facebook_messenger: "Facebook",
  telegram: "Telegram",
  zalo: "Zalo",
  api: "API",
}

/** Map channel to StatusBadge variant */
export const CHANNEL_BADGE_VARIANT: Record<ConversationChannel, string> = {
  web_widget: "active",
  facebook_messenger: "processing",
  telegram: "processing",
  zalo: "active",
  api: "draft",
}

/** Status display labels (Vietnamese) */
export const STATUS_LABELS: Record<ConversationStatus, string> = {
  active: "Đang hoạt động",
  closed: "Đã đóng",
  archived: "Đã lưu trữ",
}
