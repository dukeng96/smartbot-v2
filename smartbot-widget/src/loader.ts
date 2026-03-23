/**
 * Smartbot Widget Loader — Async IIFE that loads the main widget bundle.
 * Deployed at /widget/loader.js (<2KB minified).
 *
 * Usage:
 *   <script src="https://api.example.com/widget/loader.js" data-bot-id="UUID"></script>
 *
 * Optional attributes:
 *   data-api-url    Override API base URL (default: script origin)
 *   data-position   "bottom-right" | "bottom-left"
 *   data-theme      "light" | "dark"
 */
;(function () {
  const s =
    document.currentScript || document.querySelector('script[data-bot-id]')

  if (!s) {
    console.error('[Smartbot] No script tag with data-bot-id found')
    return
  }

  const botId = s.getAttribute('data-bot-id')
  if (!botId) {
    console.error('[Smartbot] Missing data-bot-id attribute')
    return
  }

  const apiUrl = s.getAttribute('data-api-url') || undefined
  const position = s.getAttribute('data-position') || undefined
  const theme = s.getAttribute('data-theme') || undefined

  // Derive bundle URL from same origin as this loader script
  let bundleUrl: string
  try {
    bundleUrl = new URL(
      '/widget/smartbot-widget.iife.js',
      (s as HTMLScriptElement).src,
    ).href
  } catch {
    // Fallback: assume same origin
    bundleUrl = '/widget/smartbot-widget.iife.js'
  }

  const script = document.createElement('script')
  script.src = bundleUrl
  script.async = true

  script.onload = function () {
    if (!(window as any).SmartbotWidget) return

    try {
      new (window as any).SmartbotWidget({
        botId,
        ...(apiUrl && { apiUrl }),
        ...(position && { position }),
        ...(theme && { theme }),
      })
    } catch (err) {
      console.error('[Smartbot] Init failed:', err)
    }
  }

  script.onerror = function () {
    console.error('[Smartbot] Failed to load widget bundle from ' + bundleUrl)
  }

  document.head.appendChild(script)
})()
