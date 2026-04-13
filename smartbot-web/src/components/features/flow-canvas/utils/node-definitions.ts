import type { NodeDefinition } from "@/lib/types/flow"

// TODO(post-MVP): fetch from GET /api/v1/flows/node-types — exported from Python Pydantic schemas
// For MVP, these definitions are maintained client-side and match Python BaseNode implementations

export const NODE_DEFINITIONS: NodeDefinition[] = [
  {
    type: "start",
    label: "Bắt đầu",
    description: "Điểm vào của flow. Nhận tin nhắn từ người dùng.",
    category: "io",
    icon: "Play",
    inputs: [],
    outputs: [
      { name: "message", label: "Tin nhắn", type: "string" },
      { name: "state", label: "Flow State", type: "object" },
    ],
  },
  {
    type: "llm",
    label: "VNPT LLM",
    description: "Gọi VNPT LLM với messages array. Hỗ trợ {{state.var}} và {{nodeId.output}}.",
    category: "llm",
    icon: "Sparkles",
    inputs: [
      {
        name: "messages",
        label: "Messages",
        type: "messages_array",
        required: true,
        default: [{ role: "user", content: "{{start.message}}" }],
        connectableHandle: false,
      },
      {
        name: "model",
        label: "Model",
        type: "select",
        required: true,
        default: "llm-medium-v4",
        options: [
          { label: "Small v4 (1 credit)", value: "llm-small-v4" },
          { label: "Medium v4 (2 credits)", value: "llm-medium-v4" },
          { label: "Large v4 (4 credits)", value: "llm-large-v4" },
        ],
        connectableHandle: false,
      },
      {
        name: "credential",
        label: "Credential VNPT",
        type: "credential",
        required: true,
        connectableHandle: false,
      },
      {
        name: "temperature",
        label: "Temperature",
        type: "number",
        default: 0.7,
        connectableHandle: false,
      },
      {
        name: "max_tokens",
        label: "Max Tokens",
        type: "number",
        default: 2048,
        connectableHandle: false,
      },
      {
        name: "memory",
        label: "Bật bộ nhớ hội thoại",
        type: "boolean",
        default: false,
        connectableHandle: false,
      },
      {
        name: "input",
        label: "Input",
        type: "any",
        connectableHandle: true,
      },
    ],
    outputs: [
      { name: "output", label: "Kết quả", type: "string" },
    ],
  },
  {
    type: "retriever",
    label: "Retriever",
    description: "Tìm kiếm ngữ cảnh từ Knowledge Base bằng hybrid search (BM25 + embeddings).",
    category: "retrieval",
    icon: "Search",
    inputs: [
      {
        name: "knowledge_base_id",
        label: "Knowledge Base",
        type: "kb",
        required: true,
        connectableHandle: false,
      },
      {
        name: "query",
        label: "Query",
        type: "string",
        default: "{{start.message}}",
        connectableHandle: false,
      },
      {
        name: "top_k",
        label: "Top K",
        type: "number",
        default: 5,
        connectableHandle: false,
      },
      {
        name: "input",
        label: "Input",
        type: "any",
        connectableHandle: true,
      },
    ],
    outputs: [
      { name: "context", label: "Ngữ cảnh", type: "string" },
      { name: "sources", label: "Nguồn", type: "array" },
    ],
  },
  {
    type: "agent",
    label: "Agent",
    description: "ReAct agent với danh sách tools. Tự động lên kế hoạch và thực thi.",
    category: "agent",
    icon: "Bot",
    inputs: [
      {
        name: "tools",
        label: "Tools",
        type: "custom_tool_list",
        required: true,
        connectableHandle: false,
      },
      {
        name: "model",
        label: "Model",
        type: "select",
        required: true,
        default: "llm-medium-v4",
        options: [
          { label: "Small v4", value: "llm-small-v4" },
          { label: "Medium v4", value: "llm-medium-v4" },
          { label: "Large v4", value: "llm-large-v4" },
        ],
        connectableHandle: false,
      },
      {
        name: "credential",
        label: "Credential VNPT",
        type: "credential",
        required: true,
        connectableHandle: false,
      },
      {
        name: "system_prompt",
        label: "System Prompt",
        type: "string",
        connectableHandle: false,
      },
      {
        name: "max_iterations",
        label: "Max Iterations",
        type: "number",
        default: 10,
        connectableHandle: false,
      },
      {
        name: "input",
        label: "Input",
        type: "any",
        connectableHandle: true,
      },
    ],
    outputs: [
      { name: "output", label: "Kết quả", type: "string" },
    ],
  },
  {
    type: "custom_tool",
    label: "Custom Tool",
    description: "Gọi một Custom Tool do người dùng định nghĩa.",
    category: "tool",
    icon: "Wrench",
    inputs: [
      {
        name: "tool_id",
        label: "Tool",
        type: "custom_tool_list",
        required: true,
        connectableHandle: false,
      },
      {
        name: "input",
        label: "Input",
        type: "any",
        connectableHandle: true,
      },
    ],
    outputs: [
      { name: "output", label: "Kết quả", type: "any" },
    ],
  },
  {
    type: "custom_function",
    label: "Custom Function",
    description: "Thực thi đoạn code Python trong sandbox RestrictedPython.",
    category: "tool",
    icon: "Code",
    inputs: [
      {
        name: "code",
        label: "Python Code",
        type: "code",
        required: true,
        default: "def run(state):\n    return {\"result\": state.get(\"message\", \"\")}",
        connectableHandle: false,
      },
      {
        name: "input",
        label: "Input",
        type: "any",
        connectableHandle: true,
      },
    ],
    outputs: [
      { name: "output", label: "Kết quả", type: "any" },
    ],
  },
  {
    type: "condition",
    label: "Điều kiện",
    description: "Rẽ nhánh flow dựa trên điều kiện Python đơn giản.",
    category: "control",
    icon: "GitBranch",
    inputs: [
      {
        name: "condition",
        label: "Điều kiện (Python)",
        type: "string",
        required: true,
        default: "state.get('intent') == 'greeting'",
        connectableHandle: false,
      },
      {
        name: "input",
        label: "Input",
        type: "any",
        connectableHandle: true,
      },
    ],
    outputs: [
      { name: "true", label: "Đúng", type: "any" },
      { name: "false", label: "Sai", type: "any" },
    ],
  },
  {
    type: "direct_reply",
    label: "Trả lời trực tiếp",
    description: "Trả về văn bản cố định cho người dùng, không qua LLM.",
    category: "io",
    icon: "MessageSquare",
    inputs: [
      {
        name: "message",
        label: "Nội dung trả lời",
        type: "string",
        required: true,
        default: "",
        connectableHandle: false,
      },
      {
        name: "input",
        label: "Input",
        type: "any",
        connectableHandle: true,
      },
    ],
    outputs: [],
  },
  {
    type: "http",
    label: "HTTP Request",
    description: "Gọi API bên ngoài bằng HTTP.",
    category: "utility",
    icon: "Globe",
    inputs: [
      {
        name: "url",
        label: "URL",
        type: "string",
        required: true,
        connectableHandle: false,
      },
      {
        name: "method",
        label: "Method",
        type: "select",
        default: "GET",
        options: [
          { label: "GET", value: "GET" },
          { label: "POST", value: "POST" },
          { label: "PUT", value: "PUT" },
          { label: "DELETE", value: "DELETE" },
        ],
        connectableHandle: false,
      },
      {
        name: "headers",
        label: "Headers (JSON)",
        type: "code",
        default: "{}",
        connectableHandle: false,
      },
      {
        name: "body",
        label: "Body (JSON)",
        type: "code",
        default: "{}",
        connectableHandle: false,
      },
      {
        name: "input",
        label: "Input",
        type: "any",
        connectableHandle: true,
      },
    ],
    outputs: [
      { name: "response", label: "Response", type: "any" },
      { name: "status", label: "Status Code", type: "number" },
    ],
  },
  {
    type: "human_input",
    label: "Human Input",
    description: "Dừng flow và chờ phản hồi từ người dùng.",
    category: "io",
    icon: "User",
    inputs: [
      {
        name: "prompt",
        label: "Câu hỏi cho người dùng",
        type: "string",
        required: true,
        connectableHandle: false,
      },
      {
        name: "input",
        label: "Input",
        type: "any",
        connectableHandle: true,
      },
    ],
    outputs: [
      { name: "response", label: "Phản hồi", type: "string" },
    ],
  },
  {
    type: "sticky_note",
    label: "Ghi chú",
    description: "Ghi chú không tham gia vào luồng thực thi.",
    category: "utility",
    icon: "StickyNote",
    inputs: [
      {
        name: "content",
        label: "Nội dung",
        type: "string",
        default: "",
        connectableHandle: false,
      },
    ],
    outputs: [],
  },
]

export const NODE_DEFINITION_MAP: Record<string, NodeDefinition> = Object.fromEntries(
  NODE_DEFINITIONS.map((d) => [d.type, d])
)
