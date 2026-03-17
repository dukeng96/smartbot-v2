"use client"

import { Code, ExternalLink, MessageCircle } from "lucide-react"

import type { BotEmbedCode } from "@/lib/types/bot"
import { CopyButton } from "@/components/shared/copy-button"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"

interface BotEmbedCodeSectionProps {
  embedCode: BotEmbedCode | undefined
  isLoading: boolean
}

const EMBED_CARDS = [
  {
    key: "bubble" as const,
    icon: MessageCircle,
    title: "Chat Bubble Widget",
    description: "Nút chat nổi ở góc trang web",
    bullets: ["Tự động hiển thị nút chat", "Mở rộng thành cửa sổ chat", "Tùy chỉnh vị trí và màu sắc"],
  },
  {
    key: "iframe" as const,
    icon: Code,
    title: "iFrame Embed",
    description: "Nhúng trực tiếp vào trang web",
    bullets: ["Nhúng như một phần của trang", "Tùy chỉnh kích thước", "Phù hợp cho trang hỗ trợ"],
  },
  {
    key: "directLink" as const,
    icon: ExternalLink,
    title: "Direct Link",
    description: "Link trực tiếp đến giao diện chat",
    bullets: ["Chia sẻ qua email hoặc tin nhắn", "Không cần nhúng code", "Mở trong tab mới"],
  },
] as const

export function BotEmbedCodeSection({ embedCode, isLoading }: BotEmbedCodeSectionProps) {
  if (isLoading) return <LoadingSkeleton variant="cards" rows={3} />

  return (
    <div className="space-y-4">
      <h3 className="text-[14px] font-semibold text-foreground">Mã nhúng</h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {EMBED_CARDS.map((card) => {
          const code = embedCode?.[card.key] ?? ""
          return (
            <div key={card.key} className="flex flex-col rounded-xl border border-border bg-card">
              <div className="space-y-2 p-4">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                    <card.icon className="size-4 text-primary" />
                  </div>
                  <h4 className="text-[13px] font-semibold text-foreground">{card.title}</h4>
                </div>
                <p className="text-[12px] text-text-secondary">{card.description}</p>
                <ul className="space-y-1">
                  {card.bullets.map((b, i) => (
                    <li key={i} className="text-[12px] text-text-muted">
                      &bull; {b}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Code block */}
              <div className="relative mt-auto rounded-b-xl bg-[#1E1E2E] p-3">
                <pre className="overflow-x-auto text-[11px] leading-relaxed text-[#CDD6F4]">
                  <code>{code || "Chưa có mã nhúng"}</code>
                </pre>
                {code && (
                  <div className="absolute right-2 top-2">
                    <CopyButton text={code} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
