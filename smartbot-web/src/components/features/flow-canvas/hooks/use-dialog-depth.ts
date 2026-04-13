import { useFlowStore } from "./use-flow-store"

export function useDialogDepth() {
  const pushDialogDepth = useFlowStore((s) => s.pushDialogDepth)
  const popDialogDepth = useFlowStore((s) => s.popDialogDepth)
  const dialogDepth = useFlowStore((s) => s.dialogDepth)

  return { dialogDepth, pushDialogDepth, popDialogDepth }
}
