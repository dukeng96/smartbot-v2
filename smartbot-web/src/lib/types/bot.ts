/**
 * Bot entity type — minimal shape for selectors and lists.
 */
export interface Bot {
  id: string
  name: string
  status: "active" | "draft" | "paused"
  description?: string
}
