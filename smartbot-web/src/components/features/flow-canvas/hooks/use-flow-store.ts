import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { current } from "immer"
import type { Connection, Edge, NodeChange, EdgeChange, OnNodesChange, OnEdgesChange, XYPosition } from "@xyflow/react"
import { applyNodeChanges, applyEdgeChanges } from "@xyflow/react"
import type { NodeData, StateUpdate, FlowData, NodeDefinition, NodeTrace } from "@/lib/types/flow"
import { createNode } from "../utils/node-factory"
import { duplicateNode } from "../utils/duplicate-node"

interface FlowNode extends Omit<import("@xyflow/react").Node, "data"> {
  data: NodeData
}

export interface FlowStore {
  flowId: string
  name: string
  nodes: FlowNode[]
  edges: Edge[]
  selectedNodeId: string | null
  dirty: boolean
  dialogDepth: number
  traceMap: Record<string, NodeTrace>

  // Actions — all immer-backed, immutable
  setTraceMap(map: Record<string, NodeTrace>): void
  setFlow(flow: { id: string; name: string; flowData?: FlowData; nodes?: FlowNode[]; edges?: Edge[] }): void
  onNodesChange: OnNodesChange<FlowNode>
  onEdgesChange: OnEdgesChange
  addNode(definition: NodeDefinition, position: XYPosition): void
  updateNodeData(id: string, patch: Partial<NodeData>): void
  updateNodeConfig(id: string, key: string, value: unknown): void
  updateNodeStateWrites(id: string, rows: StateUpdate[]): void
  deleteNode(id: string): void
  connect(params: Connection): void
  deleteEdge(id: string): void
  duplicate(id: string): void
  setSelected(id: string | null): void
  markClean(): void
  pushDialogDepth(): void
  popDialogDepth(): void
}

export const useFlowStore = create<FlowStore>()(
  immer((set) => ({
    flowId: "",
    name: "",
    nodes: [],
    edges: [],
    selectedNodeId: null,
    dirty: false,
    dialogDepth: 0,
    traceMap: {},

    setTraceMap: (map) =>
      set((state) => {
        state.traceMap = map
      }),

    setFlow: (flow) =>
      set((state) => {
        state.flowId = flow.id
        state.name = flow.name
        state.nodes = (flow.flowData?.nodes ?? flow.nodes ?? []) as FlowNode[]
        state.edges = flow.flowData?.edges ?? flow.edges ?? []
        state.selectedNodeId = null
        state.dirty = false
      }),

    onNodesChange: (changes: NodeChange<FlowNode>[]) =>
      set((state) => {
        state.nodes = applyNodeChanges(changes, state.nodes)
        state.dirty = true
      }),

    onEdgesChange: (changes: EdgeChange[]) =>
      set((state) => {
        state.edges = applyEdgeChanges(changes, state.edges)
        state.dirty = true
      }),

    addNode: (definition, position) =>
      set((state) => {
        const node = createNode(definition, position) as FlowNode
        state.nodes.push(node)
        state.selectedNodeId = node.id
        state.dirty = true
      }),

    updateNodeData: (id, patch) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === id)
        if (node) {
          Object.assign(node.data, patch)
          state.dirty = true
        }
      }),

    updateNodeConfig: (id, key, value) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === id)
        if (node) {
          node.data.config[key] = value
          state.dirty = true
        }
      }),

    updateNodeStateWrites: (id, rows) =>
      set((state) => {
        const node = state.nodes.find((n) => n.id === id)
        if (node) {
          node.data.stateWrites = rows
          state.dirty = true
        }
      }),

    deleteNode: (id) =>
      set((state) => {
        state.nodes = state.nodes.filter((n) => n.id !== id)
        state.edges = state.edges.filter(
          (e) => e.source !== id && e.target !== id
        )
        if (state.selectedNodeId === id) state.selectedNodeId = null
        state.dirty = true
      }),

    connect: (params) =>
      set((state) => {
        if (!params.source || !params.target || !params.sourceHandle || !params.targetHandle) return
        const edge: Edge = {
          id: `e-${params.sourceHandle}-${params.targetHandle}`,
          source: params.source,
          target: params.target,
          sourceHandle: params.sourceHandle,
          targetHandle: params.targetHandle,
          type: "custom",
          animated: false,
        }
        state.edges.push(edge)
        state.dirty = true
      }),

    deleteEdge: (id) =>
      set((state) => {
        state.edges = state.edges.filter((e) => e.id !== id)
        state.dirty = true
      }),

    duplicate: (id) =>
      set((state) => {
        const source = state.nodes.find((n) => n.id === id)
        if (!source) return
        // current() extracts plain object from immer draft for structuredClone compatibility
        const copy = duplicateNode(current(source) as FlowNode, state.nodes as FlowNode[], state.edges as Edge[]) as FlowNode
        state.nodes.push(copy)
        state.selectedNodeId = copy.id
        state.dirty = true
      }),

    setSelected: (id) =>
      set((state) => {
        state.selectedNodeId = id
      }),

    markClean: () =>
      set((state) => {
        state.dirty = false
      }),

    pushDialogDepth: () =>
      set((state) => {
        state.dialogDepth += 1
      }),

    popDialogDepth: () =>
      set((state) => {
        if (state.dialogDepth > 0) state.dialogDepth -= 1
      }),
  }))
)
