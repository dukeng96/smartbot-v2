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
    | "flow_state_init_editor"
    | "any"
  description?: string
  required?: boolean
  default?: unknown
  options?: Array<{ label: string; value: string }>
  placeholder?: string
  // Whether this input shows as a connectable handle (vs config-only in drawer)
  connectableHandle?: boolean
  // Conditional visibility: only show this field when another field has a specific value
  showWhen?: { field: string; value: unknown }
}

export interface NodeOutputDefinition {
  name: string
  label: string
  type: string
  // If true, this output is a branch (condition node true/false paths).
  // Branch outputs each get their own handle; data outputs share a single handle.
  isBranch?: boolean
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
  // Hide from sidebar palette / Cmd+K picker. Engine still recognises the type
  // and existing instances loaded from a saved flow continue to render.
  hiddenInPalette?: boolean
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
  viewport?: { x: number; y: number; zoom: number }
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
  toolCall?: { tool_name: string; tool_id: string; inputs: Record<string, unknown> }
  toolResult?: { tool_id: string; output: unknown }
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
}

export interface SseNodeEndEvent {
  type: "node_end"
  node_id: string
}

export interface SseNodeErrorEvent {
  type: "node_error"
  node_id: string
  error: string
}

export interface SseStateUpdatedEvent {
  type: "state_updated"
  node_id: string
  data: { updates: Record<string, unknown> }
}

export interface SseAwaitingInputEvent {
  type: "awaiting_input"
  node_id: string
  data: { prompt: string; context?: unknown }
}

export interface SseToolCallEvent {
  type: "tool_call"
  node_id: string
  data: { tool_name: string; tool_id: string; inputs: Record<string, unknown> }
}

export interface SseToolResultEvent {
  type: "tool_result"
  node_id: string
  data: { tool_id: string; output: unknown }
}

export interface SseHumanInputRequiredEvent {
  type: "human_input_required"
  node_id: string
  data: { run_id: string; exec_id?: string; prompt: string }
}

export interface SseErrorEvent {
  type: "error"
  message: string
}

export interface SseDoneEvent {
  type: "done"
  data: Record<string, never>
}

export interface SseRetrievalEvent {
  type: "retrieval"
  node_id: string
  data: {
    chunks: Array<{
      ref_index: number
      content: string
      document_name?: string
      breadcrumb?: string
    }>
  }
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
  | SseToolCallEvent
  | SseToolResultEvent
  | SseHumanInputRequiredEvent
  | SseRetrievalEvent
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
  credentialType: string
  createdAt: string
}

// Custom tool picker item
export interface CustomToolItem {
  id: string
  name: string
  description: string
  schema?: Record<string, unknown>
}

// Paginated wrapper for list endpoints
export interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export type { XYPosition }
