import { redirect } from "next/navigation"

/**
 * Bot detail index. Redirects to Flow Canvas as default tab.
 */
export default async function BotDetailPage({
  params,
}: {
  params: Promise<{ botId: string }>
}) {
  const { botId } = await params
  redirect(`/bots/${botId}/flow`)
}
