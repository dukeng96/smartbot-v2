"use client"

import { useEffect } from "react"
import { ReactFlowProvider } from "@xyflow/react"
import { FlowCanvas } from "@/components/features/flow-canvas/flow-canvas"
import { useFlowStore } from "@/components/features/flow-canvas/hooks/use-flow-store"
import { useFlow } from "@/lib/hooks/use-flow"
import { useBot } from "@/lib/hooks/use-bots"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { ErrorState } from "@/components/shared/error-state"

interface FlowCanvasClientProps {
  botId: string
}

function FlowLoader({ botId }: { botId: string }) {
  const { data: bot, isLoading: botLoading, isError: botError, refetch: refetchBot } = useBot(botId)

  // Resolve flowId: backend auto-provisions one flow per bot (bot.flowId).
  // Fallback to botId for legacy bots before Phase 01 migration.
  const flowId = bot?.flowId ?? botId

  const { data: flow, isLoading: flowLoading, isError: flowError, refetch: refetchFlow } = useFlow(flowId)
  const setFlow = useFlowStore((s) => s.setFlow)

  useEffect(() => {
    if (flow) {
      setFlow(flow)
    }
  }, [flow, setFlow])

  if (botLoading || flowLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSkeleton />
      </div>
    )
  }

  if (botError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <ErrorState message="Không thể tải thông tin bot. Vui lòng thử lại." onRetry={refetchBot} />
      </div>
    )
  }

  if (flowError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <ErrorState message="Không thể tải flow. Vui lòng thử lại." onRetry={refetchFlow} />
      </div>
    )
  }

  return <FlowCanvas flowId={flowId} botId={botId} />
}

export function FlowCanvasClient({ botId }: FlowCanvasClientProps) {
  return (
    <ReactFlowProvider>
      <FlowLoader botId={botId} />
    </ReactFlowProvider>
  )
}
