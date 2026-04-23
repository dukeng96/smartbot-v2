/** Renders a single chat message bubble (user or assistant). */
export class MessageBubble {
  private element: HTMLDivElement | null = null
  private contentEl: HTMLDivElement | null = null

  render(role: 'user' | 'assistant', content: string): HTMLElement {
    this.element = document.createElement('div')
    this.element.className = `sb-message ${role}`

    this.contentEl = document.createElement('div')
    this.contentEl.className = 'sb-message-content'
    this.contentEl.innerHTML = this.renderMarkdownLite(content)

    this.element.appendChild(this.contentEl)
    return this.element
  }

  /** Append streaming content (for SSE delta events). */
  appendContent(chunk: string): void {
    if (!this.contentEl) return
    // Re-render full content to handle markdown correctly
    const current = this.contentEl.getAttribute('data-raw') || ''
    const updated = current + chunk
    this.contentEl.setAttribute('data-raw', updated)
    this.contentEl.innerHTML = this.renderMarkdownLite(updated)
  }

  /** Set full content (replaces existing). */
  setContent(content: string): void {
    if (!this.contentEl) return
    this.contentEl.setAttribute('data-raw', content)
    this.contentEl.innerHTML = this.renderMarkdownLite(content)
  }

  getElement(): HTMLDivElement | null {
    return this.element
  }

  /**
   * Markdown-lite renderer: bold, italic, inline code, links.
   * No full parser — just regex replacements (~30 lines).
   */
  private renderMarkdownLite(text: string): string {
    return text
      // Escape HTML first
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Inline code (before bold/italic to avoid conflicts)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Links [text](url)
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
      )
      // Line breaks
      .replace(/\n/g, '<br>')
  }
}
