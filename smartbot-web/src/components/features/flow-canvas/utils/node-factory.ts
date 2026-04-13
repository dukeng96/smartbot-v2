import type { XYPosition } from "@xyflow/react"
import type { NodeDefinition, NodeData } from "@/lib/types/flow"
import { encodeHandleId } from "./handle-id"

function nanoid(len = 6): string {
  return Math.random().toString(36).slice(2, 2 + len)
}

export function createNode(
  definition: NodeDefinition,
  position: XYPosition
): { id: string; type: string; position: XYPosition; data: NodeData } {
  const id = `${definition.type}_${nanoid()}`

  const inputAnchors = definition.inputs
    .filter((i) => i.connectableHandle)
    .map((i) => ({
      id: encodeHandleId(id, "in", i.name, i.type),
      name: i.name,
      type: i.type,
    }))

  const outputAnchors = definition.outputs.map((o) => ({
    id: encodeHandleId(id, "out", o.name, o.type),
    name: o.name,
    type: o.type,
  }))

  const config: Record<string, unknown> = {}
  for (const input of definition.inputs) {
    if (input.default !== undefined) {
      config[input.name] = input.default
    }
  }

  return {
    id,
    type: "genericNode",
    position,
    data: {
      definition,
      inputAnchors,
      outputAnchors,
      config,
      stateWrites: [],
    },
  }
}
