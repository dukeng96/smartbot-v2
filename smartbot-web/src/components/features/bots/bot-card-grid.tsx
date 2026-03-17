"use client"

import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { MoreHorizontal, Eye, Copy, Trash2 } from "lucide-react"

import type { Bot } from "@/lib/types/bot"
import { StatusBadge } from "@/components/shared/status-badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

/** Deterministic hue from bot name for avatar background */
function nameToColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 60%, 55%)`
}

interface BotCardGridProps {
  bots: Bot[]
  onDuplicate: (bot: Bot) => void
  onDelete: (bot: Bot) => void
}

export function BotCardGrid({ bots, onDuplicate, onDelete }: BotCardGridProps) {
  const router = useRouter()

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {bots.map((bot) => {
        const usagePercent = bot.maxKnowledgeChars > 0
          ? Math.round((bot.currentKnowledgeChars / bot.maxKnowledgeChars) * 100)
          : 0

        return (
          <div
            key={bot.id}
            className="cursor-pointer rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            onClick={() => router.push(`/bots/${bot.id}/config`)}
          >
            {/* Header: avatar + name + status + menu */}
            <div className="flex items-start gap-3">
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-lg text-[18px] font-semibold text-white"
                style={{ backgroundColor: nameToColor(bot.name) }}
              >
                {bot.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-[14px] font-semibold text-foreground">{bot.name}</h3>
                  <StatusBadge status={bot.status} />
                </div>
                {bot.description && (
                  <p className="mt-0.5 line-clamp-2 text-[13px] text-text-secondary">{bot.description}</p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon-sm" />}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => router.push(`/bots/${bot.id}/config`)}>
                    <Eye className="size-4" /> Xem chi tiết
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(bot)}>
                    <Copy className="size-4" /> Nhân bản
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => onDelete(bot)}>
                    <Trash2 className="size-4" /> Xóa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Stats */}
            <div className="mt-4 flex items-center gap-4 text-[12px] text-text-muted">
              <span>{bot._count?.conversations ?? 0} hội thoại</span>
              <span>{bot._count?.knowledgeBases ?? 0} KB</span>
            </div>

            {/* Usage bar */}
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[12px] text-text-muted">
                <span>Dung lượng</span>
                <span>{usagePercent}%</span>
              </div>
              <Progress value={usagePercent} />
            </div>

            {/* Footer */}
            <p className="mt-3 text-[12px] text-text-muted">
              Tạo {formatDistanceToNow(new Date(bot.createdAt), { addSuffix: true, locale: vi })}
            </p>
          </div>
        )
      })}
    </div>
  )
}
