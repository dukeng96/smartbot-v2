import { format, formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"

/**
 * Format to Vietnamese date: DD/MM/YYYY
 */
export function formatDate(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy")
}

/**
 * Format to Vietnamese date+time: DD/MM/YYYY HH:mm
 */
export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy HH:mm")
}

/**
 * Relative time in Vietnamese: "5 phút trước", "2 ngày trước"
 */
export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: vi,
  })
}
