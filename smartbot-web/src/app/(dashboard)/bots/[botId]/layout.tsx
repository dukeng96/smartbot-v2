"use client"

import type { ReactNode } from "react"
import { useParams, usePathname, useRouter } from "next/navigation"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/layout/page-header"

const BOT_TABS = [
  { value: "config", label: "Cấu hình", segment: "config" },
  { value: "personality", label: "Tính cách", segment: "personality" },
  { value: "widget", label: "Widget", segment: "widget" },
  { value: "api-embed", label: "API & Embed", segment: "api-embed" },
  { value: "knowledge-bases", label: "Knowledge Bases", segment: "knowledge-bases" },
  { value: "channels", label: "Kênh kết nối", segment: "channels" },
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

  return (
    <div className="space-y-6">
      <PageHeader title="Chi tiết Bot" description={`Bot ID: ${params.botId}`} />

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
