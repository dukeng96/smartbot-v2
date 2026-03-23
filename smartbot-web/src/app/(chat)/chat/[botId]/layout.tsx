import type { ReactNode } from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Chat — Smartbot",
  description: "Trò chuyện với AI Assistant",
}

/**
 * Minimal layout for the direct-link chat page.
 * No sidebar, no dashboard shell, no auth card wrapper — just full-viewport chat.
 */
export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh w-full overflow-hidden bg-background">
      {children}
    </div>
  )
}
