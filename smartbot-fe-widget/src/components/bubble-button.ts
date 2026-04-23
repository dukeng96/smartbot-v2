export interface BubbleButtonConfig {
  onToggle: () => void
  position?: 'bottom-right' | 'bottom-left'
  hidden?: boolean
}

const CHAT_ICON = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`

const CLOSE_ICON = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`

export class BubbleButton {
  private readonly config: BubbleButtonConfig
  private element: HTMLButtonElement | null = null
  isActive = false

  constructor(config: BubbleButtonConfig) {
    this.config = config
  }

  render(): HTMLElement {
    this.element = document.createElement('button')
    this.element.className = `sb-bubble ${this.getPositionClass()}`
    this.element.setAttribute('aria-label', 'Open chat')
    this.element.setAttribute('title', 'Chat with us')
    this.element.innerHTML = CHAT_ICON

    if (this.config.hidden) {
      this.element.classList.add('hidden')
    }

    this.element.addEventListener('click', () => this.config.onToggle())
    return this.element
  }

  setActive(active: boolean): void {
    this.isActive = active
    if (!this.element) return

    this.element.setAttribute('aria-label', active ? 'Close chat' : 'Open chat')
    this.element.innerHTML = active ? CLOSE_ICON : CHAT_ICON
  }

  setPosition(position: 'bottom-right' | 'bottom-left'): void {
    if (!this.element) return
    this.element.classList.remove('left', 'right')
    this.element.classList.add(this.toClass(position))
  }

  private getPositionClass(): string {
    return this.toClass(this.config.position || 'bottom-right')
  }

  private toClass(position: string): string {
    return position === 'bottom-left' ? 'left' : 'right'
  }
}
