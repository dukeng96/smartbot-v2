/** Three bouncing dots shown while assistant is generating a response. */
export class TypingIndicator {
  private element: HTMLDivElement | null = null

  render(): HTMLElement {
    this.element = document.createElement('div')
    this.element.className = 'sb-message assistant'
    this.element.setAttribute('aria-label', 'Assistant is typing')

    const dots = document.createElement('div')
    dots.className = 'sb-typing'

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span')
      dot.className = 'sb-typing-dot'
      dots.appendChild(dot)
    }

    this.element.appendChild(dots)
    return this.element
  }

  show(): void {
    if (this.element) this.element.style.display = 'flex'
  }

  hide(): void {
    if (this.element) this.element.style.display = 'none'
  }

  remove(): void {
    this.element?.remove()
    this.element = null
  }
}
