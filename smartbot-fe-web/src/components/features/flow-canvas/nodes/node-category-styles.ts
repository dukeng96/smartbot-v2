import type { NodeCategory } from "@/lib/types/flow"

export const CATEGORY_BORDER: Record<NodeCategory, string> = {
  llm:       "border-l-4 border-l-violet-500",
  retrieval: "border-l-4 border-l-blue-500",
  agent:     "border-l-4 border-l-amber-500",
  control:   "border-l-4 border-l-slate-500",
  io:        "border-l-4 border-l-emerald-500",
  tool:      "border-l-4 border-l-rose-500",
  memory:    "border-l-4 border-l-cyan-500",
  utility:   "border-l-4 border-l-gray-400",
}

export const CATEGORY_LABEL: Record<NodeCategory, string> = {
  llm:       "LLM",
  retrieval: "Retrieval",
  agent:     "Agent",
  control:   "Control",
  io:        "I/O",
  tool:      "Tool",
  memory:    "Memory",
  utility:   "Utility",
}
