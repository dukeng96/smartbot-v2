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
 * Returns "—" for null, undefined, or invalid dates
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "—"
  const d = new Date(date)
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "—"
  return formatDistanceToNow(d, {
    addSuffix: true,
    locale: vi,
  })
}
