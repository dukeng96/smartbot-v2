import { FlowCanvasClient } from "./flow-canvas-client"

interface FlowPageProps {
  params: Promise<{ botId: string }>
}

/**
 * Canvas page for /bots/[botId]/flow.
 * Bypasses the BotDetailLayout tab shell via its own layout.tsx.
 *
 * NOTE: Bot.flowId (1:1 relation) is added by backend Phase 01.
 * Until then, flowId === botId is used as the lookup key since
 * the backend auto-provisions one flow per bot.
 */
export default async function FlowPage({ params }: FlowPageProps) {
  const { botId } = await params

  return <FlowCanvasClient botId={botId} flowId={botId} />
}
