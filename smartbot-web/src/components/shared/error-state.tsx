import { AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

/**
 * Error state — icon + message + "Thử lại" retry button.
 * Used when `isError === true` on any page.
 */
export function ErrorState({
  message = "Đã xảy ra lỗi. Vui lòng thử lại.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-[#FEF2F2]">
        <AlertCircle className="size-6 text-[#DC2626]" />
      </div>
      <p className="mt-4 max-w-sm text-[13px] text-text-secondary">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  )
}
