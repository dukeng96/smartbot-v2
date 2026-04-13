import type { Connection, Edge } from "@xyflow/react"
import { decodeHandleId } from "./handle-id"

export function wouldCreateCycle(
  sourceId: string,
  targetId: string,
  edges: Array<{ source: string; target: string }>
): boolean {
  // BFS from targetId — if we reach sourceId, adding this edge creates a cycle
  const adj: Record<string, string[]> = {}
  for (const edge of edges) {
    ;(adj[edge.source] ??= []).push(edge.target)
  }
  const queue = [targetId]
  const visited = new Set<string>()
  while (queue.length) {
    const node = queue.shift()!
    if (node === sourceId) return true
    if (visited.has(node)) continue
    visited.add(node)
    for (const next of adj[node] ?? []) {
      queue.push(next)
    }
  }
  return false
}

export function canConnect(
  conn: Connection | Edge,
  edges: Array<{ source: string; target: string }>
): boolean {
  if (!conn.source || !conn.target || !conn.sourceHandle || !conn.targetHandle) {
    return false
  }
  if (conn.source === conn.target) return false

  const src = decodeHandleId(conn.sourceHandle)
  const tgt = decodeHandleId(conn.targetHandle)

  // Type must match unless target accepts "any"
  if (src.type !== tgt.type && tgt.type !== "any") return false

  // DAG-only: no cycles
  if (wouldCreateCycle(conn.source, conn.target, edges)) return false

  return true
}
