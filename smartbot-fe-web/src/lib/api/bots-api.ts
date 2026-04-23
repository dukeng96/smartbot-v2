import type { PaginatedResponse, ListParams } from "@/lib/types/api-responses"
import type { Bot, BotEmbedCode, BotKnowledgeBase } from "@/lib/types/bot"
import type { Channel } from "@/lib/types/channel"
import type { CreateBotInput, UpdateBotInput, UpdatePersonalityInput, UpdateWidgetInput } from "@/lib/validations/bot-schemas"
import { apiGet, apiPost, apiPatch, apiDelete } from "./client"

export interface BotListParams extends ListParams {
  status?: string
}

export const botsApi = {
  // CRUD
  list: (params?: BotListParams) =>
    apiGet<PaginatedResponse<Bot>>("api/v1/bots", params as Record<string, string | number | boolean | undefined>),

  getById: (id: string) =>
    apiGet<Bot>(`api/v1/bots/${id}`),

  create: (data: CreateBotInput) =>
    apiPost<Bot>("api/v1/bots", data),

  update: (id: string, data: UpdateBotInput) =>
    apiPatch<Bot>(`api/v1/bots/${id}`, data),

  delete: (id: string) =>
    apiDelete(`api/v1/bots/${id}`),

  duplicate: (id: string) =>
    apiPost<Bot>(`api/v1/bots/${id}/duplicate`),

  // Personality
  updatePersonality: (id: string, data: UpdatePersonalityInput) =>
    apiPatch<Bot>(`api/v1/bots/${id}/personality`, data),

  // Widget
  updateWidget: (id: string, data: UpdateWidgetInput) =>
    apiPatch<Bot>(`api/v1/bots/${id}/widget`, data),

  // API Key
  generateApiKey: (id: string) =>
    apiPost<{ apiKey: string }>(`api/v1/bots/${id}/api-key`),

  revokeApiKey: (id: string) =>
    apiDelete(`api/v1/bots/${id}/api-key`),

  // Embed
  getEmbedCode: (id: string) =>
    apiGet<BotEmbedCode>(`api/v1/bots/${id}/embed-code`),

  // Knowledge Bases — backend returns nested { knowledgeBase: {...} }, flatten for frontend
  getKnowledgeBases: async (id: string): Promise<BotKnowledgeBase[]> => {
    const raw = await apiGet<Array<Record<string, unknown>>>(`api/v1/bots/${id}/knowledge-bases`)
    return raw.map((item) => {
      const kb = (item.knowledgeBase ?? {}) as Record<string, unknown>
      return {
        knowledgeBaseId: (item.knowledgeBaseId ?? kb.id) as string,
        name: kb.name as string,
        totalDocuments: (kb.totalDocuments ?? 0) as number,
        totalChars: (kb.totalChars ?? 0) as number,
        status: (kb.status ?? "active") as string,
        priority: (item.priority ?? 1) as number,
      }
    })
  },

  attachKb: (id: string, data: { knowledgeBaseId: string }) =>
    apiPost(`api/v1/bots/${id}/knowledge-bases`, data),

  detachKb: (id: string, kbId: string) =>
    apiDelete(`api/v1/bots/${id}/knowledge-bases/${kbId}`),

  // Channels
  getChannels: (botId: string) =>
    apiGet<Channel[]>(`api/v1/bots/${botId}/channels`),

  createChannel: (botId: string, data: { type: string; config?: Record<string, unknown> }) =>
    apiPost<Channel>(`api/v1/bots/${botId}/channels`, data),

  updateChannel: (botId: string, channelId: string, data: Partial<Channel>) =>
    apiPatch<Channel>(`api/v1/bots/${botId}/channels/${channelId}`, data),

  deleteChannel: (botId: string, channelId: string) =>
    apiDelete(`api/v1/bots/${botId}/channels/${channelId}`),
}
