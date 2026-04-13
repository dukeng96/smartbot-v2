import type { NodeTypes } from "@xyflow/react"
import { GenericNode } from "./generic-node"

export const NODE_COMPONENT_MAP: NodeTypes = {
  genericNode: GenericNode as NodeTypes[string],
}
