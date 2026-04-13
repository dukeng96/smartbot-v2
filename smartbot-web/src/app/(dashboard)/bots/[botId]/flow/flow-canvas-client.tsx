"use client"

import { useEffect } from "react"
import { ReactFlowProvider } from "@xyflow/react"
import { FlowCanvas } from "@/components/features/flow-canvas/flow-canvas"
import { useFlowStore } from "@/components/features/flow-canvas/hooks/use-flow-store"
import { useFlow } from "@/lib/hooks/use-flow"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { ErrorState } from "@/components/shared/error-state"

interface FlowCanvasClientProps {
  botId: string
  flowId: string
}

function FlowLoader({ botId, flowId }: FlowCanvasClientProps) {
  const { data: flow, isLoading, isError, refetch } = useFlow(flowId)
  const setFlow = useFlowStore((s) => s.setFlow)

  useEffect(() => {
    if (flow) {
      setFlow(flow)
    }
  }, [flow, setFlow])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <ErrorState message="Không thể tải flow. Vui lòng thử lại." onRetry={refetch} />
      </div>
    )
  }

  return <FlowCanvas flowId={flowId} botId={botId} />
}

export function FlowCanvasClient({ botId, flowId }: FlowCanvasClientProps) {
  return (
    <ReactFlowProvider>
      <FlowLoader botId={botId} flowId={flowId} />
    </ReactFlowProvider>
  )
}
