import { FlowCanvasClient } from "./flow-canvas-client"

interface FlowPageProps {
  params: Promise<{ botId: string }>
}

export default async function FlowPage({ params }: FlowPageProps) {
  const { botId } = await params
  return <FlowCanvasClient botId={botId} />
}
