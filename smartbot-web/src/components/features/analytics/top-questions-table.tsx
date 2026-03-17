import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TopQuestion } from "@/lib/types/analytics"
import { formatNumber } from "@/lib/utils/format-number"

interface TopQuestionsTableProps {
  data: TopQuestion[]
}

/**
 * Numbered list of top questions with count badges.
 * Shown on F1 (when bot selected) and F2 bot analytics.
 */
export function TopQuestionsTable({ data }: TopQuestionsTableProps) {
  if (data.length === 0) {
    return (
      <Card className="p-5">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-[14px] font-semibold">Câu hỏi phổ biến</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <p className="text-[13px] text-text-secondary">Chưa có dữ liệu</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-[14px] font-semibold">Câu hỏi phổ biến</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="space-y-2">
          {data.map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] font-medium text-text-secondary">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-foreground" title={item.sample}>
                  {item.question_prefix}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-primary-light px-2 py-0.5 text-[12px] font-medium text-primary">
                {formatNumber(item.count)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
