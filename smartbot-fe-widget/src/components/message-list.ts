import type { Message } from '../types'
import { MessageBubble } from './message-bubble'
import { TypingIndicator } from './typing-indicator'

/** Scrollable container for chat messages with typing indicator support. */
export class MessageList {
  private element: HTMLDivElement | null = null
  private typingIndicator: TypingIndicator | null = null

  render(): HTMLElement {
    this.element = document.createElement('div')
    this.element.className = 'sb-message-list'
    this.element.setAttribute('role', 'log')
    this.element.setAttribute('aria-label', 'Chat messages')
    return this.element
  }

  /** Add a complete message to the list. */
  addMessage(role: 'user' | 'assistant', content: string): void {
    if (!this.element) return
    const bubble = new MessageBubble()
    this.element.appendChild(bubble.render(role, content))
    this.scrollToBottom()
  }

  /** Load conversation history (array of messages). */
  loadHistory(messages: Message[]): void {
    if (!this.element) return
    this.element.innerHTML = ''

    for (const msg of messages) {
      if (msg.role === 'system') continue
      const bubble = new MessageBubble()
      this.element.appendChild(bubble.render(msg.role as 'user' | 'assistant', msg.content))
    }
    this.scrollToBottom()
  }

  /** Start a streaming assistant response — returns the bubble for appending chunks. */
  startStream(): MessageBubble {
    this.removeTypingIndicator()
    const bubble = new MessageBubble()
    this.element?.appendChild(bubble.render('assistant', ''))
    this.scrollToBottom()
    return bubble
  }

  /** Show typing indicator. */
  showTyping(): void {
    if (this.typingIndicator || !this.element) return
    this.typingIndicator = new TypingIndicator()
    this.element.appendChild(this.typingIndicator.render())
    this.scrollToBottom()
  }

  /** Remove typing indicator. */
  removeTypingIndicator(): void {
    if (!this.typingIndicator) return
    this.typingIndicator.remove()
    this.typingIndicator = null
  }

  /** Clear all messages. */
  clear(): void {
    if (this.element) this.element.innerHTML = ''
    this.typingIndicator = null
  }

  scrollToBottom(): void {
    if (!this.element) return
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      if (this.element) {
        this.element.scrollTop = this.element.scrollHeight
      }
    })
  }
}
