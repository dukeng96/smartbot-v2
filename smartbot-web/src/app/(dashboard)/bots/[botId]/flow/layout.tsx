import type { ReactNode } from "react"

/**
 * Full-bleed layout for the canvas page — overrides the parent BotDetailLayout
 * tab shell. The canvas needs 100% viewport height with no sidebar padding.
 * Next.js nested layouts stack: root → dashboard → bots/[botId] → flow.
 * This layout renders children directly without the tab chrome.
 */
export default function FlowLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
