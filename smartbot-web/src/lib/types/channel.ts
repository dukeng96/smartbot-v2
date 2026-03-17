export type ChannelType = "web_widget" | "facebook_messenger" | "telegram" | "zalo" | "api"
export type ChannelStatus = "active" | "inactive" | "error"

export interface Channel {
  id: string
  botId: string
  type: ChannelType
  status: ChannelStatus
  config: Record<string, unknown>
  connectedAt: string | null
  lastActiveAt: string | null
  createdAt: string
  updatedAt: string
}
