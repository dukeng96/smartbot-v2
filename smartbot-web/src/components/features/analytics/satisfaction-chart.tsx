import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SatisfactionData } from "@/lib/types/analytics"
import { formatNumber } from "@/lib/utils/format-number"

const RATING_LABELS: Record<string, string> = {
  "5": "Rất hài lòng",
  "4": "Hài lòng",
  "3": "Bình thường",
  "2": "Không hài lòng",
  "1": "Rất không hài lòng",
}

const RATING_COLORS: Record<string, string> = {
  "5": "#059669",
  "4": "#6D28D9",
  "3": "#2563EB",
  "2": "#D97706",
  "1": "#DC2626",
}

interface SatisfactionChartProps {
  data: SatisfactionData
}

/**
 * Horizontal bar chart — rating distribution (1-5 stars).
 * Shown on F1 (when bot selected) and F2 bot analytics.
 */
export function SatisfactionChart({ data }: SatisfactionChartProps) {
  const maxCount = Math.max(
    ...Object.values(data.distribution).map(Number),
    1
  )

  return (
    <Card className="p-5">
      <CardHeader className="p-0 pb-4">
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-[14px] font-semibold">Đánh giá hài lòng</CardTitle>
          {data.totalRatings > 0 && (
            <span className="text-[12px] text-text-muted">
              TB: {data.avgRating.toFixed(1)} / 5 ({formatNumber(data.totalRatings)} đánh giá)
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {data.totalRatings === 0 ? (
          <p className="text-[13px] text-text-secondary">Chưa có đánh giá</p>
        ) : (
          <div className="space-y-2.5">
            {["5", "4", "3", "2", "1"].map((rating) => {
              const count = data.distribution[rating] ?? 0
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0

              return (
                <div key={rating} className="flex items-center gap-3">
                  <span className="w-[120px] shrink-0 text-[12px] text-text-secondary">
                    {RATING_LABELS[rating]}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: RATING_COLORS[rating],
                      }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-[12px] tabular-nums text-text-muted">
                    {formatNumber(count)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
