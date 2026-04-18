import type { XYPosition, Node } from "@xyflow/react"
import type { NodeDefinition, NodeData, StateUpdate } from "@/lib/types/flow"
import { encodeHandleId } from "./handle-id"

function nanoid(len = 6): string {
  return Math.random().toString(36).slice(2, 2 + len)
}

export function buildNodeData(
  id: string,
  definition: NodeDefinition,
  existingConfig?: Record<string, unknown>,
  stateWrites?: StateUpdate[]
): NodeData {
  const inputAnchors = definition.inputs
    .filter((i) => i.connectableHandle)
    .map((i) => ({
      id: encodeHandleId(id, "in", i.name, i.type),
      name: i.name,
      type: i.type,
    }))

  // Branch outputs (e.g., condition true/false) each get their own handle.
  // Data outputs share a single handle — accessed via {{nodeId.fieldName}} template.
  const branchOutputs = definition.outputs.filter((o) => o.isBranch)
  const dataOutputs = definition.outputs.filter((o) => !o.isBranch)

  const outputAnchors = [
    ...branchOutputs.map((o) => ({
      id: encodeHandleId(id, "out", o.name, o.type),
      name: o.name,
      type: o.type,
    })),
    ...(dataOutputs.length > 0
      ? [{
          id: encodeHandleId(id, "out", "output", "any"),
          name: "output",
          type: "any",
        }]
      : []),
  ]

  const config: Record<string, unknown> = {}
  for (const input of definition.inputs) {
    if (input.default !== undefined) {
      config[input.name] = input.default
    }
  }
  if (existingConfig) {
    Object.assign(config, existingConfig)
  }

  return {
    definition,
    inputAnchors,
    outputAnchors,
    config,
    stateWrites: stateWrites ?? [],
  }
}

export function createNode(
  definition: NodeDefinition,
  position: XYPosition
): { id: string; type: string; position: XYPosition; data: NodeData } {
  const id = `${definition.type}_${nanoid()}`
  return {
    id,
    type: "genericNode",
    position,
    data: buildNodeData(id, definition),
  }
}

// Inverse of hydrateNode: collapse NodeData → backend engine format
// { id, type: '<engine-type>', position, data: { ...config, _stateWrites } }
export function serializeNode(node: Node<NodeData>): {
  id: string
  type: string
  position: XYPosition
  data: Record<string, unknown>
} {
  const { definition, config, stateWrites } = node.data
  const serializedData: Record<string, unknown> = { ...config }
  if (stateWrites.length > 0) {
    serializedData._stateWrites = stateWrites
  }
  return {
    id: node.id,
    type: definition.type,
    position: node.position,
    data: serializedData,
  }
}
