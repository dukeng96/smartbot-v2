import type { Edge } from "@xyflow/react"
import type { NodeData } from "@/lib/types/flow"
import { encodeHandleId, decodeHandleId } from "./handle-id"

interface FlowNode {
  id: string
  type?: string
  position: { x: number; y: number }
  data: NodeData
}

function nanoid(len = 6): string {
  return Math.random().toString(36).slice(2, 2 + len)
}

function remapHandleId(handleId: string, oldId: string, newId: string): string {
  const decoded = decodeHandleId(handleId)
  if (decoded.nodeId !== oldId) return handleId
  return encodeHandleId(newId, decoded.dir, decoded.name, decoded.type)
}

export function duplicateNode(
  source: FlowNode,
  _nodes: FlowNode[],
  _edges: Edge[]
): FlowNode {
  const newId = `${source.data.definition.type}_${nanoid()}`

  const newInputAnchors = source.data.inputAnchors.map((a) => ({
    ...a,
    id: remapHandleId(a.id, source.id, newId),
  }))

  const newOutputAnchors = source.data.outputAnchors.map((a) => ({
    ...a,
    id: remapHandleId(a.id, source.id, newId),
  }))

  // Deep-clone config, clear any {{nodeId.output}} refs to old node
  const clonedConfig = structuredClone(source.data.config) as Record<string, unknown>
  clearNodeRefs(clonedConfig, source.id)

  return {
    id: newId,
    type: source.type ?? "genericNode",
    position: { x: source.position.x + 40, y: source.position.y + 40 },
    data: {
      ...source.data,
      inputAnchors: newInputAnchors,
      outputAnchors: newOutputAnchors,
      config: clonedConfig,
      stateWrites: structuredClone(source.data.stateWrites),
    },
  }
}

function clearNodeRefs(obj: Record<string, unknown>, oldNodeId: string): void {
  const refPattern = new RegExp(`\\{\\{${oldNodeId}\\.output\\}\\}`, "g")
  for (const key of Object.keys(obj)) {
    const val = obj[key]
    if (typeof val === "string") {
      obj[key] = val.replace(refPattern, "")
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      clearNodeRefs(val as Record<string, unknown>, oldNodeId)
    }
  }
}
