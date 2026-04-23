/**
 * Format number as Vietnamese Dong: 199.000₫
 * Uses dot as thousands separator per Vietnamese convention.
 */
export function formatVnd(amount: number): string {
  return (
    new Intl.NumberFormat("vi-VN").format(amount) + "₫"
  )
}

/**
 * Format number as Vietnamese Dong with full label: 199.000 VND
 */
export function formatVndFull(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + " VND"
}
