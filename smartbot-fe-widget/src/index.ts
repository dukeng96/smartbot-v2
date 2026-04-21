import { SmartbotWidget } from './widget'

declare global {
  interface Window {
    SmartbotWidget: typeof SmartbotWidget
    __smartbotWidgetInstance?: SmartbotWidget
  }
}

/** Auto-init widget from <script data-bot-id="..."> tag. */
function initFromScript(): void {
  const script = document.currentScript as HTMLScriptElement | null
  if (!script) return

  const botId = script.getAttribute('data-bot-id')
  if (!botId) return // No data-bot-id = programmatic usage (iframe/loader), skip auto-init

  const apiUrl = script.getAttribute('data-api-url') || undefined
  const mode = (script.getAttribute('data-mode') as 'bubble' | 'iframe') || undefined

  const widget = new SmartbotWidget({ botId, apiUrl, mode })
  window.__smartbotWidgetInstance = widget
}

// Run init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFromScript)
} else {
  initFromScript()
}

export { SmartbotWidget }
