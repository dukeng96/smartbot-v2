export interface ChatInputConfig {
  onSend: (text: string) => void
  placeholder?: string
}

const SEND_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`

/** Textarea + send button for composing messages. */
export class ChatInput {
  private readonly config: ChatInputConfig
  private element: HTMLDivElement | null = null
  private textarea: HTMLTextAreaElement | null = null
  private sendBtn: HTMLButtonElement | null = null

  constructor(config: ChatInputConfig) {
    this.config = config
  }

  render(): HTMLElement {
    this.element = document.createElement('div')
    this.element.className = 'sb-chat-input-area'

    // Textarea
    this.textarea = document.createElement('textarea')
    this.textarea.className = 'sb-chat-textarea'
    this.textarea.placeholder = this.config.placeholder || 'Nhập tin nhắn...'
    this.textarea.setAttribute('aria-label', 'Chat input')
    this.textarea.rows = 1
    this.textarea.addEventListener('keydown', (e) => this.handleKeydown(e))
    this.textarea.addEventListener('input', () => this.autoResize())
    this.element.appendChild(this.textarea)

    // Send button
    this.sendBtn = document.createElement('button')
    this.sendBtn.className = 'sb-send-btn'
    this.sendBtn.setAttribute('aria-label', 'Send message')
    this.sendBtn.innerHTML = SEND_ICON
    this.sendBtn.addEventListener('click', () => this.send())
    this.element.appendChild(this.sendBtn)

    return this.element
  }

  disable(): void {
    if (this.textarea) this.textarea.disabled = true
    if (this.sendBtn) this.sendBtn.disabled = true
  }

  enable(): void {
    if (this.textarea) this.textarea.disabled = false
    if (this.sendBtn) this.sendBtn.disabled = false
  }

  clear(): void {
    if (this.textarea) {
      this.textarea.value = ''
      this.autoResize()
    }
  }

  focus(): void {
    this.textarea?.focus()
  }

  private send(): void {
    const text = this.textarea?.value.trim()
    if (!text) return
    this.config.onSend(text)
    this.clear()
  }

  private handleKeydown(e: KeyboardEvent): void {
    // Enter sends, Shift+Enter adds newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      this.send()
    }
  }

  private autoResize(): void {
    if (!this.textarea) return
    this.textarea.style.height = 'auto'
    this.textarea.style.height = `${Math.min(this.textarea.scrollHeight, 100)}px`
  }
}
