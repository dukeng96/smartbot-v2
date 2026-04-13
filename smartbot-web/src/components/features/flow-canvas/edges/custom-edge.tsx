"use client"

import { BaseEdge, EdgeLabelRenderer, getStraightPath } from "@xyflow/react"
import type { EdgeProps } from "@xyflow/react"
import { cn } from "@/lib/utils"

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  animated,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        className={cn(
          "stroke-muted-foreground/60",
          animated && "stroke-primary",
          selected && "stroke-primary"
        )}
        style={{ strokeWidth: selected ? 2 : 1.5 }}
      />
      {/* Label slot — unused for now, available for edge labels in future */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        />
      </EdgeLabelRenderer>
    </>
  )
}
