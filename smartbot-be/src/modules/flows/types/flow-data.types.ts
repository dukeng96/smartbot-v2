export interface FlowViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface FlowNode {
  id: string;
  // start | llm | agent | custom_tool | custom_function | condition |
  // retriever | direct_reply | sticky_note | http | human_input
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: FlowViewport;
}
