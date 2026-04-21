export interface SessionData {
  conversationId: string
  endUserId: string
  endUserName?: string
  lastActiveAt: number
}

const EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

/** localStorage-based session persistence with 24h expiry. */
export class SessionStore {
  private readonly key: string

  constructor(botId: string) {
    this.key = `smartbot_${botId}_session`
  }

  /** Get current session, or null if expired / missing. */
  getSession(): SessionData | null {
    try {
      const raw = localStorage.getItem(this.key)
      if (!raw) return null

      const data: SessionData = JSON.parse(raw)
      const age = Date.now() - data.lastActiveAt
      if (age < 0 || age > EXPIRY_MS) {
        this.clear()
        return null
      }
      return data
    } catch {
      return null // Incognito, corrupt data, etc.
    }
  }

  /** Save or update session (refreshes lastActiveAt). */
  save(data: Omit<SessionData, 'lastActiveAt'>): void {
    try {
      const record: SessionData = { ...data, lastActiveAt: Date.now() }
      localStorage.setItem(this.key, JSON.stringify(record))
    } catch {
      // Silently fail (incognito, quota exceeded)
    }
  }

  /** Remove session. */
  clear(): void {
    try {
      localStorage.removeItem(this.key)
    } catch {
      // Silently fail
    }
  }

  /** Generate a random end-user ID. */
  static generateEndUserId(): string {
    return crypto.randomUUID()
  }
}
