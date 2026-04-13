import type { Edge } from "@xyflow/react"
import type { NodeData } from "@/lib/types/flow"

interface FlowNode {
  id: string
  data: NodeData
}

export interface ValidationError {
  nodeId: string
  message: string
}

export function validateFlow(
  nodes: FlowNode[],
  edges: Edge[]
): ValidationError[] {
  const errors: ValidationError[] = []

  if (nodes.length === 0) return errors

  const connectedNodeIds = new Set<string>()
  for (const edge of edges) {
    connectedNodeIds.add(edge.source)
    connectedNodeIds.add(edge.target)
  }

  for (const node of nodes) {
    // Orphan check: nodes with >0 connections defined must be wired (except start/direct_reply)
    const type = node.data.definition.type
    const isIsolationAllowed = type === "sticky_note"
    if (
      !isIsolationAllowed &&
      nodes.length > 1 &&
      !connectedNodeIds.has(node.id)
    ) {
      errors.push({
        nodeId: node.id,
        message: `Node "${node.data.definition.label}" chưa được kết nối`,
      })
    }

    // Required-input check (config fields only, not handle anchors)
    for (const inputDef of node.data.definition.inputs) {
      if (!inputDef.required || inputDef.connectableHandle) continue
      const val = node.data.config[inputDef.name]
      if (val === undefined || val === null || val === "") {
        errors.push({
          nodeId: node.id,
          message: `Node "${node.data.definition.label}": trường "${inputDef.label}" là bắt buộc`,
        })
      }
    }
  }

  return errors
}
