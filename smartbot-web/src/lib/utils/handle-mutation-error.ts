import { HTTPError } from "ky"
import { toast } from "sonner"

/**
 * Shared error handler for TanStack Query mutations.
 * Parses ky HTTPError to extract backend error body,
 * then maps status codes to Vietnamese user-facing messages.
 */
export async function handleMutationError(error: unknown) {
  if (error instanceof HTTPError) {
    const status = error.response.status

    if (status === 403) {
      toast.error("Không có quyền truy cập")
      return
    }
    if (status === 429) {
      toast.error("Vui lòng thử lại sau")
      return
    }

    // Try to parse backend error body for message
    try {
      const body = await error.response.json() as { message?: string }
      if (body.message) {
        toast.error(body.message)
        return
      }
    } catch {
      // Body not parseable — fall through
    }

    toast.error("Không thể kết nối server")
    return
  }

  toast.error("Đã xảy ra lỗi. Vui lòng thử lại.")
}
