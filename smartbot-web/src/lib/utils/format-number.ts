/**
 * Abbreviate large numbers: 1200 → "1.2K", 3500000 → "3.5M"
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M"
  }
  if (value >= 1_000) {
    return (value / 1_000).toFixed(1).replace(/\.0$/, "") + "K"
  }
  return value.toString()
}

/**
 * Format with Vietnamese number convention: 1.234.567
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value)
}
