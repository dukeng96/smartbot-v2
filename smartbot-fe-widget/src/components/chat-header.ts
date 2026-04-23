export interface ChatHeaderConfig {
  onClose: () => void
  showClose?: boolean
}

export class ChatHeader {
  private readonly config: ChatHeaderConfig
  private element: HTMLDivElement | null = null
  private titleEl: HTMLHeadingElement | null = null
  private avatarEl: HTMLDivElement | null = null

  constructor(config: ChatHeaderConfig) {
    this.config = config
  }

  render(): HTMLElement {
    this.element = document.createElement('div')
    this.element.className = 'sb-chat-header'

    const content = document.createElement('div')
    content.className = 'sb-header-content'

    // Avatar
    this.avatarEl = document.createElement('div')
    this.avatarEl.className = 'sb-header-avatar'
    this.avatarEl.textContent = '🤖'
    content.appendChild(this.avatarEl)

    // Text
    const textWrap = document.createElement('div')
    textWrap.className = 'sb-header-text'

    this.titleEl = document.createElement('h3')
    this.titleEl.className = 'sb-header-title'
    this.titleEl.textContent = 'Chat with us'
    textWrap.appendChild(this.titleEl)

    const subtitle = document.createElement('p')
    subtitle.className = 'sb-header-subtitle'
    subtitle.textContent = 'Online'
    textWrap.appendChild(subtitle)

    content.appendChild(textWrap)
    this.element.appendChild(content)

    // Close button
    if (this.config.showClose !== false) {
      const closeBtn = document.createElement('button')
      closeBtn.className = 'sb-close-btn'
      closeBtn.setAttribute('aria-label', 'Close chat')
      closeBtn.innerHTML = '&times;'
      closeBtn.addEventListener('click', () => this.config.onClose())
      this.element.appendChild(closeBtn)
    }

    return this.element
  }

  setTitle(title: string): void {
    if (this.titleEl) this.titleEl.textContent = title
  }

  setAvatar(url: string, altText: string): void {
    if (!this.avatarEl) return
    this.avatarEl.innerHTML = ''
    const img = document.createElement('img')
    img.src = url
    img.alt = altText
    this.avatarEl.appendChild(img)
  }
}
