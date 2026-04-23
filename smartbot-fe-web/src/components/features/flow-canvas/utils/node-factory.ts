import type { XYPosition, Node } from "@xyflow/react"
import type { NodeDefinition, NodeData, StateUpdate, ConditionRule, Intent } from "@/lib/types/flow"
import { encodeHandleId } from "./handle-id"

function nanoid(len = 6): string {
  return Math.random().toString(36).slice(2, 2 + len)
}

// Generate dynamic branch outputs from conditions/intents array
function buildDynamicBranchOutputs(
  nodeId: string,
  dynamicOutputs: "conditions" | "intents",
  config: Record<string, unknown>
): Array<{ id: string; name: string; type: string }> {
  const fieldName = dynamicOutputs === "conditions" ? "conditions" : "intents"
  const items = (config[fieldName] as Array<ConditionRule | Intent>) || []

  return items.map((_, index) => ({
    id: encodeHandleId(nodeId, "out", String(index), "any"),
    name: String(index),
    type: "any",
  }))
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

  // Build config first (needed for dynamic outputs)
  const config: Record<string, unknown> = {}
  for (const input of definition.inputs) {
    if (input.default !== undefined) {
      config[input.name] = input.default
    }
  }
  if (existingConfig) {
    Object.assign(config, existingConfig)
  }

  // Handle dynamic outputs for condition/smart_router nodes
  let outputAnchors: Array<{ id: string; name: string; type: string }>

  if (definition.dynamicOutputs) {
    // Dynamic outputs based on conditions/intents array length
    outputAnchors = buildDynamicBranchOutputs(id, definition.dynamicOutputs, config)
  } else {
    // Standard outputs: branch outputs each get own handle, data outputs share one
    const branchOutputs = definition.outputs.filter((o) => o.isBranch)
    const dataOutputs = definition.outputs.filter((o) => !o.isBranch)

    outputAnchors = [
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
