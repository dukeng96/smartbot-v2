"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useParams, usePathname, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { useBot } from "@/lib/hooks/use-bots"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const BOT_TABS = [
  { value: "config", label: "Cấu hình", segment: "config" },
  { value: "personality", label: "Tính cách", segment: "personality" },
  { value: "widget", label: "Widget", segment: "widget" },
  { value: "api-embed", label: "API & Embed", segment: "api-embed" },
  { value: "knowledge-bases", label: "Knowledge Bases", segment: "knowledge-bases" },
  { value: "channels", label: "Kênh kết nối", segment: "channels" },
  { value: "flow", label: "Flow Canvas", segment: "flow" },
] as const

/**
 * Bot detail shell — tabs layout for C2-C7.
 * Active tab derived from current URL segment.
 */
export default function BotDetailLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ botId: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const activeSegment = pathname.split("/").pop() ?? "config"

  const { data: bot } = useBot(params.botId)
  const displayName = bot?.name ?? params.botId

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[14px]">
        <Link
          href="/bots"
          className="flex items-center gap-1 font-medium text-[#6D28D9] hover:underline"
        >
          <ArrowLeft className="size-4" />
          Assistants
        </Link>
        <span className="text-text-muted">/</span>
        <span className="font-semibold text-foreground">{displayName}</span>
      </div>

      <Tabs value={activeSegment}>
        <TabsList>
          {BOT_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              onClick={() => router.push(`/bots/${params.botId}/${tab.segment}`)}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {children}
    </div>
  )
}
