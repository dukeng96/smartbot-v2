import type { BotConfig, WidgetInitConfig } from './types'
import { BubbleButton } from './components/bubble-button'
import { ChatWindow } from './components/chat-window'
import { ApiClient } from './services/api-client'
import { SseParser } from './services/sse-parser'
import { SessionStore } from './services/session-store'
import type { MessageBubble } from './components/message-bubble'
import baseStyles from './styles/base.css?inline'
import themeStyles from './styles/theme.css?inline'

const FONT_SIZE_MAP: Record<string, string> = {
  small: '13px',
  medium: '14px',
  large: '16px',
}

/**
 * Main widget class — creates Shadow DOM host, injects styles,
 * orchestrates UI components, and manages chat flow via API + SSE.
 */
export class SmartbotWidget {
  private readonly botId: string
  private readonly apiUrl: string
  private readonly mode: 'bubble' | 'iframe'

  private botConfig: BotConfig | null = null
  private host: HTMLDivElement | null = null
  private shadow: ShadowRoot | null = null
  private isOpen = false

  private bubble: BubbleButton | null = null
  private chatWindow: ChatWindow | null = null

  // Services
  private readonly api: ApiClient
  private readonly session: SessionStore
  private endUserId = ''
  private conversationId: string | null = null
  private isStreaming = false
  private activeSseParser: SseParser | null = null

  constructor(config: WidgetInitConfig) {
    this.botId = config.botId
    this.apiUrl = config.apiUrl || this.detectApiUrl()
    this.mode = config.mode || 'bubble'

    this.api = new ApiClient(this.apiUrl)
    this.session = new SessionStore(this.botId)

    // Restore or create end-user identity
    const existing = this.session.getSession()
    if (existing) {
      this.endUserId = existing.endUserId
      this.conversationId = existing.conversationId
    } else {
      this.endUserId = SessionStore.generateEndUserId()
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init())
    } else {
      this.init()
    }
  }

  // -- Lifecycle ----------------------------------------------------------

  private init(): void {
    try {
      this.createHost()
      this.attachShadow()
      this.injectStyles()
      this.createComponents()
      this.attachKeyboardListeners()
      this.fetchBotConfig()
    } catch (err) {
      console.error('[SmartbotWidget] Init error:', err)
    }
  }

  private createHost(): void {
    this.host = document.createElement('div')
    this.host.id = 'smartbot-widget-root'
    this.host.setAttribute('aria-label', 'Smartbot chat widget')
    document.body.appendChild(this.host)
  }

  private attachShadow(): void {
    if (!this.host) return
    this.shadow = this.host.attachShadow({ mode: 'open' })
  }

  private injectStyles(): void {
    if (!this.shadow) return

    const cssText = [themeStyles, baseStyles].join('\n')
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(cssText)
    this.shadow.adoptedStyleSheets = [sheet]
  }

  private createComponents(): void {
    if (!this.shadow) return

    // Bubble (hidden in iframe mode)
    this.bubble = new BubbleButton({
      onToggle: () => this.toggle(),
      hidden: this.mode === 'iframe',
    })
    this.shadow.appendChild(this.bubble.render())

    // Chat window — wire onSend to API flow
    this.chatWindow = new ChatWindow({
      onClose: () => this.close(),
      onSend: (text) => this.handleSendMessage(text),
      visible: this.mode === 'iframe',
      mode: this.mode,
    })
    this.shadow.appendChild(this.chatWindow.render())
  }

  private attachKeyboardListeners(): void {
    this.shadow?.addEventListener('keydown', (e: Event) => {
      if ((e as KeyboardEvent).key === 'Escape' && this.isOpen) {
        this.close()
      }
    })
  }

  // -- Bot Config ---------------------------------------------------------

  private async fetchBotConfig(): Promise<void> {
    try {
      this.botConfig = await this.api.fetchBotConfig(this.botId)
      this.applyTheme()
      this.chatWindow?.setBotConfig(this.botConfig)

      // Load history for returning users (after greeting is set)
      if (this.conversationId) {
        await this.loadHistory()
      }
    } catch (err) {
      console.error('[SmartbotWidget] Failed to fetch config:', err)
    }
  }

  private applyTheme(): void {
    if (!this.botConfig || !this.shadow) return
    const wc = this.botConfig.widgetConfig
    const root = this.shadow.host as HTMLElement

    // CSS custom properties
    if (wc.primaryColor) root.style.setProperty('--sb-primary', wc.primaryColor)
    if (wc.backgroundColor) root.style.setProperty('--sb-bg', wc.backgroundColor)
    if (wc.fontColor) root.style.setProperty('--sb-font-color', wc.fontColor)
    if (wc.userMessageColor) root.style.setProperty('--sb-user-msg', wc.userMessageColor)
    if (wc.botMessageColor) root.style.setProperty('--sb-bot-msg', wc.botMessageColor)
    if (wc.fontFamily) root.style.setProperty('--sb-font-family', wc.fontFamily)
    if (wc.fontSize) root.style.setProperty('--sb-font-size', FONT_SIZE_MAP[wc.fontSize] || '14px')

    // Position
    const pos = wc.position || 'bottom-right'
    this.bubble?.setPosition(pos)
    this.chatWindow?.setPosition(pos)
    root.style.setProperty(pos === 'bottom-left' ? 'left' : 'right', '20px')

    // Dark theme
    if (wc.theme === 'dark') root.classList.add('dark-theme')

    // Custom CSS injection
    if (wc.customCss) {
      const customStyle = document.createElement('style')
      customStyle.textContent = wc.customCss
      this.shadow.appendChild(customStyle)
    }
  }

  // -- Chat Flow ----------------------------------------------------------

  /** Load conversation history for returning users. */
  private async loadHistory(): Promise<void> {
    if (!this.conversationId || !this.chatWindow) return

    const messages = await this.api.fetchHistory(
      this.botId,
      this.conversationId,
      this.endUserId,
    )

    if (messages.length > 0) {
      this.chatWindow.messageList.loadHistory(messages)
      this.chatWindow.suggestions.clear()
    }
  }

  /** Handle user sending a message — full SSE streaming flow. */
  private async handleSendMessage(text: string): Promise<void> {
    if (!text.trim() || this.isStreaming || !this.chatWindow) return

    const cw = this.chatWindow

    // 1. Show user message immediately
    cw.messageList.addMessage('user', text)
    cw.suggestions.clear()
    cw.input.disable()
    cw.input.clear()

    // 2. Show typing indicator
    cw.messageList.showTyping()

    let streamBubble: MessageBubble | null = null

    try {
      // 3. Send to API, get SSE stream
      const stream = await this.api.sendMessage(this.botId, {
        message: text,
        conversationId: this.conversationId ?? undefined,
        endUserId: this.endUserId,
      })

      this.isStreaming = true
      const parser = new SseParser()
      this.activeSseParser = parser

      // 4. Parse SSE events
      await parser.parse(stream, {
        onConversation: (evt) => {
          this.conversationId = evt.conversationId
          this.session.save({
            conversationId: evt.conversationId,
            endUserId: this.endUserId,
          })

          // Replace typing indicator with empty bot bubble
          streamBubble = cw.messageList.startStream()
        },

        onDelta: (evt) => {
          streamBubble?.appendContent(evt.content)
          cw.messageList.scrollToBottom()
        },

        onDone: () => {
          this.finishStream(cw)
        },

        onError: (evt) => {
          this.finishStream(cw)
          cw.messageList.addMessage('assistant', `Error: ${evt.error}`)
        },
      })
    } catch (err) {
      console.error('[SmartbotWidget] Send error:', err)
      cw.messageList.removeTypingIndicator()
      cw.messageList.addMessage('assistant', 'Failed to send message. Please try again.')
      this.finishStream(cw)
    }
  }

  /** Clean up after streaming completes or errors. */
  private finishStream(cw: ChatWindow): void {
    this.isStreaming = false
    this.activeSseParser = null
    cw.input.enable()
    cw.input.focus()
  }

  private detectApiUrl(): string {
    const scripts = document.querySelectorAll('script[data-bot-id]')
    if (scripts.length > 0) {
      const src = (scripts[scripts.length - 1] as HTMLScriptElement).src
      try {
        return new URL(src).origin
      } catch {
        // fall through
      }
    }
    return window.location.origin
  }

  // -- Public API ---------------------------------------------------------

  toggle(): void {
    this.isOpen ? this.close() : this.open()
  }

  open(): void {
    this.isOpen = true
    this.chatWindow?.show()
    this.bubble?.setActive(true)
  }

  close(): void {
    this.isOpen = false
    this.chatWindow?.hide()
    this.bubble?.setActive(false)
  }

  destroy(): void {
    this.activeSseParser?.abort()
    this.host?.remove()
    this.shadow = null
    this.host = null
    this.bubble = null
    this.chatWindow = null
  }
}
