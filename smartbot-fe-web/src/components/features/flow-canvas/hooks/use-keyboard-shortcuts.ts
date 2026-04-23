"use client"

import { useEffect } from "react"
import { useFlowStore } from "./use-flow-store"
import { useSaveFlow } from "@/lib/hooks/use-flow"
import type { FlowData } from "@/lib/types/flow"

interface UseKeyboardShortcutsOptions {
  flowId: string
  paletteOpen: () => void
}

export function useKeyboardShortcuts({ flowId, paletteOpen }: UseKeyboardShortcutsOptions) {
  const store = useFlowStore()
  const { mutate: saveFlow } = useSaveFlow(flowId)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes("MAC")
      const mod = isMac ? e.metaKey : e.ctrlKey
      const key = e.key.toLowerCase()
      const inInput = isInputFocused()

      // Delete / Backspace — allowed even when drawer is open (dialogDepth > 0),
      // as long as focus is not in a text input inside the drawer.
      if ((key === "delete" || key === "backspace") && !inInput) {
        e.preventDefault()
        if (store.selectedNodeId) {
          store.deleteNode(store.selectedNodeId)
        }
        return
      }

      // Cmd+D — duplicate selected — allowed even when drawer is open.
      if (mod && key === "d" && !inInput) {
        e.preventDefault()
        if (store.selectedNodeId) {
          store.duplicate(store.selectedNodeId)
        }
        return
      }

      // All remaining shortcuts suppressed while any dialog/drawer is open
      if (store.dialogDepth > 0) return

      // Cmd+K — open palette
      if (mod && key === "k") {
        e.preventDefault()
        paletteOpen()
        return
      }

      // Cmd+S — save
      if (mod && key === "s") {
        e.preventDefault()
        const { nodes, edges, name } = store
        saveFlow({ name, flowData: { nodes, edges } as FlowData })
        return
      }

      // Cmd+Z / Cmd+Shift+Z — undo/redo (not yet supported in RF v12.10.x)
      if (mod && key === "z") {
        e.preventDefault()
        return
      }

      // Cmd+A — select all (let React Flow handle natively via its own keyhandler)
      // We don't preventDefault here; RF v12 handles selectAll internally

      // Escape — clear selection
      if (key === "escape") {
        store.setSelected(null)
        return
      }

      // Cmd+C — copy selected (in-memory clipboard via store)
      if (mod && key === "c") {
        if (store.selectedNodeId) {
          const node = store.nodes.find((n) => n.id === store.selectedNodeId)
          if (node) {
            sessionStorage.setItem("flow_clipboard", JSON.stringify(node))
          }
        }
        return
      }

      // Cmd+V — paste from clipboard
      if (mod && key === "v") {
        const raw = sessionStorage.getItem("flow_clipboard")
        if (raw) {
          try {
            const node = JSON.parse(raw) as { data: { definition: import("@/lib/types/flow").NodeDefinition } }
            store.addNode(node.data.definition, { x: 200, y: 200 })
          } catch {
            // invalid clipboard data — ignore silently
          }
        }
        return
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [store, saveFlow, paletteOpen])
}

function isInputFocused(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return tag === "input" || tag === "textarea" || (el as HTMLElement).isContentEditable
}
