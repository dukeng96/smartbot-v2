"use client"

import { useState } from "react"
import { BaseEdge, EdgeLabelRenderer, getStraightPath } from "@xyflow/react"
import type { EdgeProps } from "@xyflow/react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFlowStore } from "../hooks/use-flow-store"

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  animated,
  selected,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false)
  const deleteEdge = useFlowStore((s) => s.deleteEdge)

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Invisible wider path for easier hover detection */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={20}
        stroke="transparent"
        style={{ pointerEvents: "stroke" }}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        className={cn(
          "stroke-muted-foreground/60 transition-colors",
          animated && "stroke-primary",
          selected && "stroke-primary",
          hovered && "stroke-primary"
        )}
        style={{ strokeWidth: selected || hovered ? 2 : 1.5 }}
      />
      {/* Delete button on hover */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          {hovered && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteEdge(id)
              }}
              className="flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </g>
  )
}
