---
title: "Session 2: API Client, SSE Streaming, Session Persistence"
description: "Wire API endpoints, implement SSE parser, session management, end-to-end chat flow"
status: complete
priority: P1
effort: 10h
completed_at: 2026-03-24
---

# Session 2: API & SSE Wiring (Phases 5.4–5.5)

**Objective:** Connect widget UI to backend APIs, implement SSE streaming, session persistence, and complete end-to-end chat flow.

**Duration:** ~10 hours
**Phases:** 5.4 (API + SSE) + 5.5 (wire everything)

---

## Overview

Session 1 created the UI shell. Session 2 makes it functional by:
1. Building HTTP client for bot config + chat endpoints
2. Implementing POST-based SSE parser (normalize \r\n, handle events)
3. Creating localStorage-based session management
4. Wiring all components together to support full chat flow
5. Handling errors, timeouts, and edge cases

Exit criteria: User sends message → SSE streams response → session persists across reloads.

---

## Requirements

### Functional
- Widget fetches bot config on init (name, avatar, greeting, suggested questions, theme)
- User sends message → typed as POST to `/api/v1/chat/:botId/messages`
- Server response streams via SSE (events: conversation, delta, done, error)
- SSE delta events append content to bot message bubble (streaming UX)
- Message list auto-scrolls to bottom
- Session saved to localStorage with 24h expiry
- Returning users load conversation history
- Error states: network error, bot not found, timeout, SSE failure
- Keyboard: Shift+Enter for newline, Enter to send, Escape to close chat

### Non-Functional
- API client: 30s timeout, graceful error handling
- SSE parser: handles malformed events, normalizes \r\n
- Session store: fallback when localStorage unavailable (incognito)
- Message rendering: safe HTML escaping (no XSS)
- Performance: no lag on fast messages, smooth streaming

---

## Files to Create

### Services (3 files, ~200 LOC)

```
smartbot-widget/src/services/
├── api-client.ts              # [80 LOC] HTTP wrapper for config + chat
├── sse-parser.ts              # [70 LOC] POST-based SSE parser with callbacks
└── session-store.ts           # [50 LOC] localStorage session management
```

---

## Detailed Implementation Steps

### Phase 5.4: API Client & SSE Parser (4 hours)

#### Step 4.1: Create src/services/api-client.ts

**File:** `smartbot-widget/src/services/api-client.ts`

HTTP client for fetching bot config and chat messages.

```typescript
import { BotConfig, Message } from '../types'

export interface ChatMessagePayload {
  message: string
  conversationId?: string
  endUserId: string
  endUserName?: string
}

export interface ChatMessageResponse {
  conversationId: string
  responseTimeMs?: number
  creditsUsed?: number
}

export class ApiClient {
  private baseUrl: string
  private timeout: number = 30000 // 30s

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
  }

  /**
   * Fetch bot configuration
   */
  async fetchBotConfig(botId: string): Promise<BotConfig> {
    const url = `${this.baseUrl}/api/v1/chat/${botId}/config`
    try {
      const response = await this.fetch(url, { method: 'GET' })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const json = await response.json()
      return json.data
    } catch (error) {
      console.error('[ApiClient] fetchBotConfig error:', error)
      throw error
    }
  }

  /**
   * Send chat message and return SSE stream
   */
  async sendMessage(
    botId: string,
    payload: ChatMessagePayload
  ): Promise<ReadableStream<Uint8Array>> {
    const url = `${this.baseUrl}/api/v1/chat/${botId}/messages`
    try {
      const response = await this.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      return response.body
    } catch (error) {
      console.error('[ApiClient] sendMessage error:', error)
      throw error
    }
  }

  /**
   * Fetch conversation history for returning users
   */
  async fetchConversationHistory(
    botId: string,
    conversationId: string,
    endUserId: string
  ): Promise<Message[]> {
    const url = `${this.baseUrl}/api/v1/chat/${botId}/conversations/${conversationId}/messages`
    try {
      const response = await this.fetch(url, {
        method: 'GET',
        headers: { 'x-end-user-id': endUserId },
      })

      if (!response.ok) {
        // 404 means conversation expired, return empty
        if (response.status === 404) return []
        throw new Error(`HTTP ${response.status}`)
      }

      const json = await response.json()
      return json.data || []
    } catch (error) {
      console.error('[ApiClient] fetchConversationHistory error:', error)
      return [] // Graceful fallback
    }
  }

  /**
   * Wrapper for fetch with timeout
   */
  private fetch(
    url: string,
    init?: RequestInit
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    return fetch(url, {
      ...init,
      signal: controller.signal,
      credentials: 'omit', // No cookies for third-party embeds
    })
      .finally(() => clearTimeout(timeoutId))
      .catch(error => {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout')
        }
        throw error
      })
  }
}
```

#### Step 4.2: Create src/services/sse-parser.ts

**File:** `smartbot-widget/src/services/sse-parser.ts`

POST-based SSE stream parser. Handles \r\n normalization (sse-starlette sends \r\n), buffering, event parsing.

```typescript
import { SseEvent, ConversationEvent, DeltaEvent, DoneEvent, ErrorEvent } from '../types'

export interface SseCallbacks {
  onConversation?: (event: ConversationEvent) => void
  onDelta?: (event: DeltaEvent) => void
  onDone?: (event: DoneEvent) => void
  onError?: (event: ErrorEvent) => void
}

export class SSEParser {
  private buffer: string = ''
  private abortController: AbortController | null = null

  /**
   * Parse SSE stream from ReadableStream
   * Returns AbortController for cancellation
   */
  async parseStream(
    stream: ReadableStream<Uint8Array>,
    callbacks: SseCallbacks
  ): Promise<AbortController> {
    this.abortController = new AbortController()
    const reader = stream.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done || this.abortController.signal.aborted) {
          break
        }

        // Decode chunk and append to buffer
        const chunk = decoder.decode(value, { stream: true })
        this.buffer += chunk

        // Process complete messages (separated by \n\n)
        this.processBuffer(callbacks)
      }

      // Decode final chunk
      const finalChunk = decoder.decode()
      if (finalChunk) {
        this.buffer += finalChunk
        this.processBuffer(callbacks)
      }

      // Flush any remaining buffer
      if (this.buffer.trim()) {
        this.parseEvent(this.buffer, callbacks)
      }
    } catch (error) {
      if (this.abortController.signal.aborted) {
        return this.abortController
      }
      console.error('[SSEParser] Stream error:', error)
      callbacks.onError?.({ error: String(error) })
    } finally {
      reader.releaseLock()
    }

    return this.abortController
  }

  /**
   * Process buffer by splitting on \n\n (SSE message separator)
   * Normalize \r\n to \n first
   */
  private processBuffer(callbacks: SseCallbacks): void {
    // Normalize line endings: \r\n → \n
    this.buffer = this.buffer.replace(/\r\n/g, '\n')

    // Split on \n\n (SSE message boundary)
    const parts = this.buffer.split('\n\n')

    // Keep last incomplete part in buffer
    this.buffer = parts[parts.length - 1]

    // Process complete messages
    for (let i = 0; i < parts.length - 1; i++) {
      if (parts[i].trim()) {
        this.parseEvent(parts[i], callbacks)
      }
    }
  }

  /**
   * Parse single SSE event
   * Format:
   *   event: conversation
   *   data: {"conversationId":"uuid"}
   */
  private parseEvent(eventString: string, callbacks: SseCallbacks): void {
    const lines = eventString.split('\n')
    let eventType: string | null = null
    let data: string = ''

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.substring(6).trim()
      } else if (line.startsWith('data:')) {
        data = line.substring(5).trim()
      }
    }

    if (!eventType || !data) {
      return
    }

    try {
      const payload = JSON.parse(data)

      switch (eventType) {
        case 'conversation':
          callbacks.onConversation?.(payload as ConversationEvent)
          break
        case 'delta':
          callbacks.onDelta?.(payload as DeltaEvent)
          break
        case 'done':
          callbacks.onDone?.(payload as DoneEvent)
          break
        case 'error':
          callbacks.onError?.(payload as ErrorEvent)
          break
        default:
          console.warn(`[SSEParser] Unknown event type: ${eventType}`)
      }
    } catch (error) {
      console.error(`[SSEParser] Failed to parse event: ${eventString}`, error)
      callbacks.onError?.({ error: 'Parse error' })
    }
  }

  /**
   * Cancel stream parsing
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
  }
}
```

#### Step 4.3: Create src/services/session-store.ts

**File:** `smartbot-widget/src/services/session-store.ts`

localStorage-based session management for persisting conversation IDs and end-user IDs.

```typescript
export interface SessionData {
  conversationId: string
  endUserId: string
  endUserName?: string
  lastActiveAt: number
}

export class SessionStore {
  private static readonly EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours
  private botId: string

  constructor(botId: string) {
    this.botId = botId
  }

  /**
   * Get current session (or null if expired/not found)
   */
  getSession(): SessionData | null {
    try {
      const key = this.getKey()
      const stored = localStorage.getItem(key)

      if (!stored) {
        return null
      }

      const data: SessionData = JSON.parse(stored)

      // Check if expired
      const age = Date.now() - data.lastActiveAt
      if (age > SessionStore.EXPIRY_MS) {
        this.clearSession()
        return null
      }

      return data
    } catch (error) {
      console.warn('[SessionStore] Failed to get session:', error)
      return null
    }
  }

  /**
   * Save or update session
   */
  saveSession(data: SessionData): void {
    try {
      const key = this.getKey()
      data.lastActiveAt = Date.now()
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.warn('[SessionStore] Failed to save session:', error)
      // Silently fail (incognito, quota exceeded, etc.)
    }
  }

  /**
   * Clear session
   */
  clearSession(): void {
    try {
      const key = this.getKey()
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('[SessionStore] Failed to clear session:', error)
    }
  }

  /**
   * Generate new end-user ID
   */
  static generateEndUserId(): string {
    return crypto.randomUUID()
  }

  private getKey(): string {
    return `smartbot_${this.botId}_session`
  }
}
```

---

### Phase 5.5: Wire Everything Together (6 hours)

Now wire components to services and implement the full chat flow.

#### Step 5.1: Update src/widget.ts

**File:** `smartbot-widget/src/widget.ts` (update existing)

Add API client, session store, and message handling.

```typescript
import { BotConfig, WidgetConfig, WidgetInitConfig, Message } from './types'
import { BubbleButton } from './components/bubble-button'
import { ChatWindow } from './components/chat-window'
import { ApiClient } from './services/api-client'
import { SessionStore, SessionData } from './services/session-store'
import { SSEParser, SseCallbacks } from './services/sse-parser'

export class SmartbotWidget {
  private botId: string
  private apiUrl: string
  private botConfig: BotConfig | null = null
  private host: HTMLDivElement | null = null
  private shadowRoot: ShadowRoot | null = null
  private isOpen: boolean = false
  private mode: 'bubble' | 'iframe'

  private bubble: BubbleButton | null = null
  private chatWindow: ChatWindow | null = null

  // Session and API
  private apiClient: ApiClient | null = null
  private sessionStore: SessionStore | null = null
  private endUserId: string = ''
  private currentConversationId: string | null = null
  private isStreaming: boolean = false
  private sseParser: SSEParser | null = null

  constructor(config: WidgetInitConfig) {
    this.botId = config.botId
    this.apiUrl = config.apiUrl || this.detectApiUrl()
    this.mode = config.mode || 'bubble'

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init())
    } else {
      this.init()
    }
  }

  private init(): void {
    try {
      this.apiClient = new ApiClient(this.apiUrl)
      this.sessionStore = new SessionStore(this.botId)

      // Restore or create session
      const session = this.sessionStore.getSession()
      if (session) {
        this.endUserId = session.endUserId
        this.currentConversationId = session.conversationId
      } else {
        this.endUserId = SessionStore.generateEndUserId()
      }

      this.createHost()
      this.attachShadowDOM()
      this.injectStyles()
      this.createComponents()
      this.attachEventListeners()
      this.fetchBotConfig()
    } catch (error) {
      console.error('[SmartbotWidget] Init error:', error)
    }
  }

  // ... [previous createHost, attachShadowDOM, injectStyles, createComponents, etc.]

  /**
   * Fetch bot config and apply theme
   */
  private async fetchBotConfig(): Promise<void> {
    if (!this.apiClient) return

    try {
      this.botConfig = await this.apiClient.fetchBotConfig(this.botId)
      this.applyTheme()

      if (this.chatWindow) {
        this.chatWindow.setBotConfig(this.botConfig)

        // Load conversation history if returning user
        if (this.currentConversationId) {
          await this.loadConversationHistory()
        }

        // Wire message handlers
        this.chatWindow.onSendMessage((text: string) => this.handleSendMessage(text))
        this.chatWindow.onSugestionSelect((question: string) => this.handleSendMessage(question))
      }
    } catch (error) {
      console.error('[SmartbotWidget] Failed to fetch config:', error)
      if (this.chatWindow) {
        this.chatWindow.showError('Failed to load chat configuration')
      }
    }
  }

  /**
   * Load conversation history for returning users
   */
  private async loadConversationHistory(): Promise<void> {
    if (!this.apiClient || !this.currentConversationId || !this.chatWindow) return

    try {
      const messages = await this.apiClient.fetchConversationHistory(
        this.botId,
        this.currentConversationId,
        this.endUserId
      )

      if (messages.length > 0) {
        // Add messages to chat window (skip greeting)
        messages.forEach(msg => {
          this.chatWindow!.addMessage(msg.role, msg.content)
        })
        // Hide suggestions if history loaded
        this.chatWindow.hideSuggestions()
      }
    } catch (error) {
      console.error('[SmartbotWidget] Failed to load history:', error)
    }
  }

  /**
   * Handle user sending message
   */
  private async handleSendMessage(text: string): Promise<void> {
    if (!text.trim() || this.isStreaming || !this.apiClient || !this.chatWindow) {
      return
    }

    try {
      // Add user message to chat
      this.chatWindow.addMessage('user', text)
      this.chatWindow.disableInput()
      this.chatWindow.showTypingIndicator()

      // Send message to API
      const stream = await this.apiClient.sendMessage(this.botId, {
        message: text,
        conversationId: this.currentConversationId || undefined,
        endUserId: this.endUserId,
        endUserName: 'Anonymous',
      })

      // Parse SSE stream
      this.isStreaming = true
      const sseParser = new SSEParser()

      const callbacks: SseCallbacks = {
        onConversation: (event) => {
          this.currentConversationId = event.conversationId
          if (this.sessionStore) {
            this.sessionStore.saveSession({
              conversationId: event.conversationId,
              endUserId: this.endUserId,
              endUserName: 'Anonymous',
              lastActiveAt: Date.now(),
            })
          }
          this.chatWindow!.hideTypingIndicator()
          this.chatWindow!.addMessage('assistant', '')
        },
        onDelta: (event) => {
          this.chatWindow!.appendToLastMessage(event.content)
        },
        onDone: (event) => {
          this.isStreaming = false
          this.chatWindow!.enableInput()
          this.chatWindow!.clearInput()
        },
        onError: (event) => {
          this.isStreaming = false
          this.chatWindow!.enableInput()
          this.chatWindow!.showError(event.error || 'An error occurred')
          this.chatWindow!.hideTypingIndicator()
        },
      }

      await sseParser.parseStream(stream, callbacks)
    } catch (error) {
      console.error('[SmartbotWidget] Send message error:', error)
      this.isStreaming = false
      if (this.chatWindow) {
        this.chatWindow.enableInput()
        this.chatWindow.showError('Failed to send message. Please try again.')
        this.chatWindow.hideTypingIndicator()
      }
    }
  }

  // ... [rest of existing methods: applyTheme, detectApiUrl, toggle, open, close, destroy]
}
```

#### Step 5.2: Update ChatWindow component

**File:** `smartbot-widget/src/components/chat-window.ts` (update existing)

Add message handling, streaming support, and callbacks.

```typescript
import { BotConfig, Message } from '../types'

export interface ChatWindowConfig {
  onClose: () => void
  visible?: boolean
}

export class ChatWindow {
  private config: ChatWindowConfig
  private element: HTMLDivElement | null = null
  private botConfig: BotConfig | null = null
  private messageList: HTMLDivElement | null = null
  private inputTextarea: HTMLTextAreaElement | null = null
  private sendBtn: HTMLButtonElement | null = null
  private suggestionsContainer: HTMLDivElement | null = null

  // Callbacks
  private onSendMessageCallback: ((text: string) => void) | null = null
  private onSuggestionSelectCallback: ((question: string) => void) | null = null

  constructor(config: ChatWindowConfig) {
    this.config = config
  }

  render(): HTMLElement {
    this.element = document.createElement('div')
    this.element.className = 'sb-chat-window'

    if (!this.config.visible) {
      this.element.classList.add('hidden')
    }

    // Create child elements
    this.element.appendChild(this.createHeader())
    this.element.appendChild(this.createMessageList())
    this.element.appendChild(this.createSuggestionsContainer())
    this.element.appendChild(this.createInputArea())
    this.element.appendChild(this.createPoweredByFooter())

    return this.element
  }

  // ... [createHeader, createSuggestionsContainer, createPoweredByFooter from Session 1]

  private createMessageList(): HTMLDivElement {
    this.messageList = document.createElement('div')
    this.messageList.className = 'sb-message-list'
    this.messageList.setAttribute('aria-label', 'Chat messages')
    this.messageList.setAttribute('role', 'region')
    this.messageList.setAttribute('aria-live', 'polite')
    return this.messageList
  }

  private createInputArea(): HTMLElement {
    const area = document.createElement('div')
    area.className = 'sb-chat-input-area'

    this.inputTextarea = document.createElement('textarea')
    this.inputTextarea.className = 'sb-chat-input-textarea'
    this.inputTextarea.placeholder = 'Type your message...'
    this.inputTextarea.setAttribute('aria-label', 'Chat input')

    // Handle Enter to send, Shift+Enter for newline
    this.inputTextarea.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    })

    // Auto-resize textarea
    this.inputTextarea.addEventListener('input', () => {
      this.inputTextarea!.style.height = 'auto'
      this.inputTextarea!.style.height = Math.min(
        this.inputTextarea!.scrollHeight,
        100 // Max 4 lines
      ) + 'px'
    })

    area.appendChild(this.inputTextarea)

    this.sendBtn = document.createElement('button')
    this.sendBtn.className = 'sb-send-btn'
    this.sendBtn.setAttribute('aria-label', 'Send message')
    this.sendBtn.innerHTML = '➤'
    this.sendBtn.addEventListener('click', () => this.sendMessage())
    area.appendChild(this.sendBtn)

    return area
  }

  // ... [createSuggestionsContainer implementation]
  private createSuggestionsContainer(): HTMLDivElement {
    this.suggestionsContainer = document.createElement('div')
    this.suggestionsContainer.className = 'sb-suggestions'
    return this.suggestionsContainer
  }

  /**
   * Register callback for send message
   */
  onSendMessage(callback: (text: string) => void): void {
    this.onSendMessageCallback = callback
  }

  /**
   * Register callback for suggestion selection
   */
  onSugestionSelect(callback: (question: string) => void): void {
    this.onSuggestionSelectCallback = callback
  }

  /**
   * Set bot configuration and render greeting + suggestions
   */
  setBotConfig(config: BotConfig): void {
    this.botConfig = config

    if (this.element) {
      // Update header
      const title = this.element.querySelector('.sb-header-title')
      if (title) title.textContent = config.name

      const avatar = this.element.querySelector('.sb-header-avatar')
      if (avatar && config.avatarUrl) {
        avatar.innerHTML = `<img src="${this.escapeHtml(config.avatarUrl)}" alt="${this.escapeHtml(config.name)}">`
      }

      // Add greeting message
      this.addMessage('assistant', config.greetingMessage)

      // Add suggestions
      this.addSuggestions(config.suggestedQuestions)
    }
  }

  /**
   * Add message to chat
   */
  addMessage(role: 'user' | 'assistant', content: string): void {
    if (!this.messageList) return

    const bubble = document.createElement('div')
    bubble.className = `sb-message ${role}`
    bubble.setAttribute('data-role', role)

    const messageEl = document.createElement('div')
    messageEl.className = 'sb-message-bubble'

    if (role === 'assistant') {
      // Render markdown-lite content
      messageEl.innerHTML = this.renderMarkdownLite(content)
    } else {
      messageEl.textContent = content
    }

    bubble.appendChild(messageEl)
    this.messageList.appendChild(bubble)
    this.scrollToBottom()
  }

  /**
   * Append content to last message (for streaming)
   */
  appendToLastMessage(content: string): void {
    if (!this.messageList) return

    const messages = this.messageList.querySelectorAll('.sb-message')
    if (messages.length === 0) return

    const lastMessage = messages[messages.length - 1]
    const bubble = lastMessage.querySelector('.sb-message-bubble')
    if (!bubble) return

    // Append content
    bubble.innerHTML += this.renderMarkdownLite(content)
    this.scrollToBottom()
  }

  /**
   * Simple markdown renderer (no full parser — too heavy)
   */
  private renderMarkdownLite(text: string): string {
    // Escape HTML first
    text = this.escapeHtml(text)

    // Bold: **text** → <strong>text</strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

    // Italic: *text* → <em>text</em>
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>')

    // Code: `text` → <code>text</code>
    text = text.replace(/`(.*?)`/g, '<code>$1</code>')

    // Links: [text](url) → <a href="url" target="_blank">text</a>
    text = text.replace(
      /\[(.*?)\]\((https?:\/\/[^\)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    )

    // Line breaks
    text = text.replace(/\n/g, '<br>')

    return text
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }
    return text.replace(/[&<>"']/g, m => map[m])
  }

  /**
   * Add suggested questions
   */
  private addSuggestions(questions: string[]): void {
    if (!this.suggestionsContainer) return
    this.suggestionsContainer.innerHTML = ''

    questions.forEach(q => {
      const chip = document.createElement('button')
      chip.className = 'sb-suggestion-chip'
      chip.textContent = q
      chip.addEventListener('click', () => {
        this.onSuggestionSelectCallback?.(q)
        this.hideSuggestions()
      })
      this.suggestionsContainer!.appendChild(chip)
    })
  }

  /**
   * Hide suggestions
   */
  hideSuggestions(): void {
    if (this.suggestionsContainer) {
      this.suggestionsContainer.style.display = 'none'
    }
  }

  /**
   * Show typing indicator
   */
  showTypingIndicator(): void {
    if (!this.messageList) return

    const indicator = document.createElement('div')
    indicator.className = 'sb-message bot'
    indicator.setAttribute('data-typing', 'true')

    const dots = document.createElement('div')
    dots.className = 'sb-typing'

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span')
      dot.className = 'sb-typing-dot'
      dots.appendChild(dot)
    }

    indicator.appendChild(dots)
    this.messageList.appendChild(indicator)
    this.scrollToBottom()
  }

  /**
   * Hide typing indicator
   */
  hideTypingIndicator(): void {
    if (!this.messageList) return
    const indicator = this.messageList.querySelector('[data-typing="true"]')
    if (indicator) {
      indicator.remove()
    }
  }

  /**
   * Disable input during streaming
   */
  disableInput(): void {
    if (this.inputTextarea) this.inputTextarea.disabled = true
    if (this.sendBtn) this.sendBtn.disabled = true
  }

  /**
   * Enable input after streaming
   */
  enableInput(): void {
    if (this.inputTextarea) this.inputTextarea.disabled = false
    if (this.sendBtn) this.sendBtn.disabled = false
  }

  /**
   * Clear input
   */
  clearInput(): void {
    if (this.inputTextarea) {
      this.inputTextarea.value = ''
      this.inputTextarea.style.height = 'auto'
    }
  }

  /**
   * Show error message
   */
  showError(message: string): void {
    if (!this.messageList) return

    const error = document.createElement('div')
    error.className = 'sb-message bot'
    error.setAttribute('data-error', 'true')

    const bubble = document.createElement('div')
    bubble.className = 'sb-message-bubble'
    bubble.style.color = '#dc2626'
    bubble.textContent = `❌ ${message}`

    error.appendChild(bubble)
    this.messageList.appendChild(error)
    this.scrollToBottom()
  }

  /**
   * Send message
   */
  private sendMessage(): void {
    if (!this.inputTextarea) return
    const text = this.inputTextarea.value.trim()
    if (text) {
      this.onSendMessageCallback?.(text)
    }
  }

  /**
   * Auto-scroll to bottom
   */
  private scrollToBottom(): void {
    if (this.messageList) {
      setTimeout(() => {
        this.messageList!.scrollTop = this.messageList!.scrollHeight
      }, 0)
    }
  }

  // ... [show, hide, etc. from Session 1]
  public show(): void {
    if (this.element) this.element.classList.remove('hidden')
  }

  public hide(): void {
    if (this.element) this.element.classList.add('hidden')
  }
}
```

---

## Success Criteria — Session 2

- [ ] Widget fetches bot config on init (name, avatar, greeting, suggestions)
- [ ] Theme applies correctly (colors, fonts, position)
- [ ] User can type and send messages (Enter to send, Shift+Enter for newline)
- [ ] Message appears as user bubble immediately
- [ ] SSE stream received from server
- [ ] Bot response streams in real-time (delta events append content)
- [ ] Typing indicator shows during streaming
- [ ] Session saved to localStorage after first message
- [ ] Returning user loads conversation history
- [ ] Error states display (network error, timeout, bot not found)
- [ ] Input disabled during streaming, re-enabled after done
- [ ] Messages rendered with safe HTML (no XSS)
- [ ] Markdown-lite works: bold, italic, code, links
- [ ] Message list auto-scrolls to bottom
- [ ] No console errors
- [ ] Chat flow: send → stream → persist → reload → history loads

---

## Key Implementation Notes

1. **SSE \r\n normalization:** Essential — sse-starlette sends `\r\n`; must normalize to `\n` before splitting on `\n\n`

2. **Markdown-lite:** Regex-based, no external parser:
   ```
   **bold** → <strong>bold</strong>
   *italic* → <em>italic</em>
   `code` → <code>code</code>
   [link](url) → <a href="url" target="_blank">link</a>
   ```

3. **HTML escaping:** Always escape user input + bot messages before inserting into DOM

4. **Session persistence:** Key format `smartbot_${botId}_session`, expires 24h

5. **Keyboard handling:** Enter to send, Shift+Enter for newline, Escape to close

6. **Error handling:** Every API call can fail — show user-friendly messages, log detailed errors to console

---

## Next Steps

Session 3 will create the loader script, backend static serving, iframe page, and polish (animations, mobile UX).

