import type { Node, Edge, XYPosition } from "@xyflow/react"

// Input/output schema for a node (mirrors Python Pydantic field)
export interface NodeInputDefinition {
  name: string
  label: string
  type:
    | "string"
    | "number"
    | "boolean"
    | "select"
    | "credential"
    | "kb"
    | "messages_array"
    | "code"
    | "custom_tool_list"
    | "any"
  description?: string
  required?: boolean
  default?: unknown
  options?: Array<{ label: string; value: string }>
  placeholder?: string
  // Whether this input shows as a connectable handle (vs config-only in drawer)
  connectableHandle?: boolean
}

export interface NodeOutputDefinition {
  name: string
  label: string
  type: string
}

// Node type registry entry
export interface NodeDefinition {
  type: string
  label: string
  description: string
  category: NodeCategory
  icon: string
  inputs: NodeInputDefinition[]
  outputs: NodeOutputDefinition[]
  version?: number
}

export type NodeCategory =
  | "llm"
  | "retrieval"
  | "agent"
  | "control"
  | "io"
  | "tool"
  | "memory"
  | "utility"

// update_flow_state row
export interface StateUpdate {
  key: string
  value: string
}

// LLM messages array entry
export interface MessageEntry {
  role: "system" | "user" | "assistant"
  content: string
}

// Per-node config data stored in RF Node.data
export interface NodeData extends Record<string, unknown> {
  definition: NodeDefinition
  inputAnchors: Array<{ id: string; name: string; type: string }>
  outputAnchors: Array<{ id: string; name: string; type: string }>
  // Key-value config (what the user fills in the drawer)
  config: Record<string, unknown>
  // update_flow_state repeater
  stateWrites: StateUpdate[]
}

// React Flow canvas data persisted to backend
export interface FlowData {
  nodes: Node<NodeData>[]
  edges: Edge[]
}

// Full Flow entity (from GET /api/v1/flows/:id)
export interface Flow {
  id: string
  botId: string
  name: string
  flowData: FlowData
  createdAt: string
  updatedAt: string
}

// Per-node execution trace (populated by test panel SSE events)
export interface NodeTrace {
  nodeId: string
  running: boolean
  duration?: number
  error?: string
  awaitingInput?: boolean
  outputPreview?: string
}

// Test panel SSE event shapes — field names match backend snake_case from Python engine
export interface SseConversationEvent {
  type: "conversation"
  conversationId: string
}

export interface SseFlowStartEvent {
  type: "flow_start"
}

export interface SseTokenEvent {
  type: "token"
  content: string
}

export interface SseNodeStartEvent {
  type: "node_start"
  node_id: string
  node_type?: string
  ts?: number
}

export interface SseNodeEndEvent {
  type: "node_end"
  node_id: string
  output_preview?: string
  duration_ms?: number
  ts?: number
}

export interface SseNodeErrorEvent {
  type: "node_error"
  node_id: string
  error?: string
}

export interface SseStateUpdatedEvent {
  type: "state_updated"
  key: string
  value: unknown
}

export interface SseAwaitingInputEvent {
  type: "awaiting_input"
  node_id: string
  prompt: string
}

export interface SseErrorEvent {
  type: "error"
  node_id?: string
  message: string
  code?: string
}

export interface SseDoneEvent {
  type: "done"
  total_duration_ms?: number
  credits_used?: number
}

export type SseEvent =
  | SseConversationEvent
  | SseFlowStartEvent
  | SseTokenEvent
  | SseNodeStartEvent
  | SseNodeEndEvent
  | SseNodeErrorEvent
  | SseStateUpdatedEvent
  | SseAwaitingInputEvent
  | SseErrorEvent
  | SseDoneEvent

// Save flow request body
export interface SaveFlowDto {
  name?: string
  flowData: FlowData
}

// Credential picker item
export interface CredentialItem {
  id: string
  name: string
  type: string
  createdAt: string
}

// Custom tool picker item
export interface CustomToolItem {
  id: string
  name: string
  description: string
  schema?: Record<string, unknown>
}

export type { XYPosition }
