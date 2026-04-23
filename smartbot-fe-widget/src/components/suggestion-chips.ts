export interface SuggestionChipsConfig {
  onSelect: (question: string) => void
}

/** Row of suggested question buttons shown below the greeting. */
export class SuggestionChips {
  private readonly config: SuggestionChipsConfig
  private element: HTMLDivElement | null = null

  constructor(config: SuggestionChipsConfig) {
    this.config = config
  }

  render(): HTMLElement {
    this.element = document.createElement('div')
    this.element.className = 'sb-suggestions'
    this.element.setAttribute('aria-label', 'Suggested questions')
    return this.element
  }

  setQuestions(questions: string[]): void {
    if (!this.element) return
    this.element.innerHTML = ''

    for (const q of questions) {
      const chip = document.createElement('button')
      chip.className = 'sb-suggestion-chip'
      chip.textContent = q
      chip.addEventListener('click', () => this.config.onSelect(q))
      this.element.appendChild(chip)
    }
  }

  clear(): void {
    if (this.element) this.element.innerHTML = ''
  }
}
