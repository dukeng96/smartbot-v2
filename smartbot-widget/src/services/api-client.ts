import type { BotConfig, Message } from '../types'

export interface ChatMessagePayload {
  message: string
  conversationId?: string
  endUserId: string
  endUserName?: string
}

/** HTTP client for widget API calls with timeout support. */
export class ApiClient {
  private readonly baseUrl: string
  private readonly timeout = 30_000

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  /** Fetch bot configuration (name, avatar, greeting, theme). */
  async fetchBotConfig(botId: string): Promise<BotConfig> {
    const url = `${this.baseUrl}/api/v1/chat/${botId}/config`
    const res = await this.request(url, { method: 'GET' })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json = await res.json()
    return json.data
  }

  /** Send chat message, returns SSE ReadableStream. */
  async sendMessage(
    botId: string,
    payload: ChatMessagePayload,
  ): Promise<ReadableStream<Uint8Array>> {
    const url = `${this.baseUrl}/api/v1/chat/${botId}/messages`
    const res = await this.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (!res.body) throw new Error('No response body')

    return res.body
  }

  /** Fetch conversation history for returning users. */
  async fetchHistory(
    botId: string,
    conversationId: string,
    endUserId: string,
  ): Promise<Message[]> {
    const url = `${this.baseUrl}/api/v1/chat/${botId}/conversations/${conversationId}/messages`
    try {
      const res = await this.request(url, {
        method: 'GET',
        headers: { 'x-end-user-id': endUserId },
      })

      if (!res.ok) {
        if (res.status === 404) return [] // Conversation expired
        throw new Error(`HTTP ${res.status}`)
      }

      const json = await res.json()
      return json.data || []
    } catch {
      // Graceful fallback — don't block widget init
      return []
    }
  }

  /** Fetch with AbortController timeout. */
  private async request(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)

    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
        credentials: 'omit', // No cookies for third-party embeds
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }
}
