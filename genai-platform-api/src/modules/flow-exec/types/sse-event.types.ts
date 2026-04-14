export type SseEventType =
  | 'flow_start'
  | 'node_start'
  | 'token'
  | 'node_end'
  | 'node_error'
  | 'llm_call_completed'
  | 'state_updated'
  | 'awaiting_input'
  | 'tool_call'
  | 'tool_result'
  | 'human_input_required'
  | 'done'
  | 'error';

export interface SseEvent {
  type: SseEventType;
  node_id?: string;
  content?: string;        // top-level for token events (frontend reads event.content)
  data?: Record<string, any>;
  output?: any;
  error?: string;
  message?: string;
}

export interface NodeTrace {
  nodeId: string;
  startedAt: number;
  finishedAt?: number;
  duration?: number;
  output?: any;
  error?: string;
}

export interface RunFlowParams {
  flow: { id: string; flowData: any };
  botId: string;
  tenantId: string;
  sessionId: string;
  message: string;
  conversationId: string;
  history: Array<{ role: string; content: string }>;
}
