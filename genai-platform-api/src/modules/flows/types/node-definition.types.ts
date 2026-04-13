export interface NodeInputDefinition {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface NodeOutputDefinition {
  name: string;
  type: string;
}

export interface NodeDefinition {
  type: string;
  label: string;
  description: string;
  inputs: NodeInputDefinition[];
  outputs: NodeOutputDefinition[];
  allowLoop?: boolean;
}
