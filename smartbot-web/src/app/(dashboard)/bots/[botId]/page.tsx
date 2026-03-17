import { redirect } from "next/navigation"

/**
 * C2 — Bot detail index. Redirects to /config tab.
 */
export default async function BotDetailPage({
  params,
}: {
  params: Promise<{ botId: string }>
}) {
  const { botId } = await params
  redirect(`/bots/${botId}/config`)
}
