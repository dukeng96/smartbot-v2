"use client"

import { useState, useCallback, useRef } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useDialogDepth } from "./use-dialog-depth"

interface ConfirmOptions {
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
  resolve: ((value: boolean) => void) | null
}

export function useConfirm() {
  const { pushDialogDepth, popDialogDepth } = useDialogDepth()
  const [state, setState] = useState<ConfirmState>({
    open: false,
    resolve: null,
  })

  const confirm = useCallback(
    (options: ConfirmOptions = {}): Promise<boolean> => {
      return new Promise((resolve) => {
        pushDialogDepth()
        setState({ open: true, resolve, ...options })
      })
    },
    [pushDialogDepth]
  )

  const handleClose = useCallback(
    (value: boolean) => {
      state.resolve?.(value)
      popDialogDepth()
      setState({ open: false, resolve: null })
    },
    [state, popDialogDepth]
  )

  const ConfirmDialog = useCallback(
    () => (
      <AlertDialog open={state.open} onOpenChange={(o) => !o && handleClose(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state.title ?? "Xác nhận"}</AlertDialogTitle>
            {state.description && (
              <AlertDialogDescription>{state.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleClose(false)}>
              {state.cancelLabel ?? "Hủy"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleClose(true)}>
              {state.confirmLabel ?? "Xác nhận"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ),
    [state, handleClose]
  )

  return { confirm, ConfirmDialog }
}
