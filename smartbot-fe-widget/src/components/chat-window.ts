import type { BotConfig } from '../types'
import { ChatHeader } from './chat-header'
import { MessageList } from './message-list'
import { SuggestionChips } from './suggestion-chips'
import { ChatInput } from './chat-input'

export interface ChatWindowConfig {
  onClose: () => void
  onSend: (text: string) => void
  visible?: boolean
  mode?: 'bubble' | 'iframe'
  position?: 'bottom-right' | 'bottom-left'
}

/**
 * Main chat window container.
 * Composes: ChatHeader + MessageList + SuggestionChips + ChatInput + PoweredBy footer.
 */
export class ChatWindow {
  private readonly config: ChatWindowConfig
  private element: HTMLDivElement | null = null

  readonly header: ChatHeader
  readonly messageList: MessageList
  readonly suggestions: SuggestionChips
  readonly input: ChatInput
  private poweredByEl: HTMLDivElement | null = null

  constructor(config: ChatWindowConfig) {
    this.config = config

    this.header = new ChatHeader({
      onClose: config.onClose,
      showClose: config.mode !== 'iframe',
    })

    this.messageList = new MessageList()

    this.suggestions = new SuggestionChips({
      onSelect: (q) => config.onSend(q),
    })

    this.input = new ChatInput({
      onSend: (text) => config.onSend(text),
    })
  }

  render(): HTMLElement {
    this.element = document.createElement('div')
    this.element.className = 'sb-chat-window'
    this.element.setAttribute('role', 'dialog')
    this.element.setAttribute('aria-label', 'Chat window')

    // Position class
    const posClass = this.config.position === 'bottom-left' ? 'left' : 'right'
    this.element.classList.add(posClass)

    // iframe mode: no fixed positioning
    if (this.config.mode === 'iframe') {
      this.element.classList.add('iframe-mode')
    }

    if (!this.config.visible) {
      this.element.classList.add('hidden')
    }

    // Compose children
    this.element.appendChild(this.header.render())
    this.element.appendChild(this.messageList.render())
    this.element.appendChild(this.suggestions.render())
    this.element.appendChild(this.input.render())
    this.element.appendChild(this.createPoweredBy())

    return this.element
  }

  /** Apply bot configuration to all child components. */
  setBotConfig(config: BotConfig): void {
    // Header
    this.header.setTitle(
      config.widgetConfig.displayName || config.widgetConfig.headerText || config.name,
    )
    if (config.avatarUrl || config.widgetConfig.logoUrl) {
      this.header.setAvatar(
        (config.avatarUrl || config.widgetConfig.logoUrl)!,
        config.name,
      )
    }

    // Greeting message
    if (config.greetingMessage) {
      this.messageList.addMessage('assistant', config.greetingMessage)
    }

    // Suggestion chips
    if (config.suggestedQuestions?.length) {
      this.suggestions.setQuestions(config.suggestedQuestions)
    }

    // Powered by
    if (config.widgetConfig.showPoweredBy === false && this.poweredByEl) {
      this.poweredByEl.classList.add('hidden')
    }
  }

  setPosition(position: 'bottom-right' | 'bottom-left'): void {
    if (!this.element) return
    this.element.classList.remove('left', 'right')
    this.element.classList.add(position === 'bottom-left' ? 'left' : 'right')
  }

  show(): void {
    this.element?.classList.remove('hidden')
    this.input.focus()
  }

  hide(): void {
    this.element?.classList.add('hidden')
  }

  private createPoweredBy(): HTMLElement {
    this.poweredByEl = document.createElement('div')
    this.poweredByEl.className = 'sb-powered-by'
    this.poweredByEl.innerHTML =
      'Powered by <a href="https://smartbot.vn" target="_blank" rel="noopener noreferrer">Smartbot</a>'
    return this.poweredByEl
  }
}
