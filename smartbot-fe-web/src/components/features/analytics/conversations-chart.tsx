"use client"

import { format } from "date-fns"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ConversationDataPoint } from "@/lib/types/analytics"
import { formatNumber } from "@/lib/utils/format-number"

interface ConversationsChartProps {
  data: ConversationDataPoint[]
}

/**
 * Area chart — conversations over time. Purple fill.
 * Used on F1 analytics overview (left column, 60% width).
 */
export function ConversationsChart({ data }: ConversationsChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: format(new Date(d.date), "dd/MM"),
  }))

  return (
    <Card className="p-5">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-[14px] font-semibold">
          Hội thoại theo thời gian
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={formatted}>
            <defs>
              <linearGradient id="convGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6D28D9" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6D28D9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "#9CA3AF" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#9CA3AF" }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 13,
              }}
              formatter={(value) => [formatNumber(value as number), "Hội thoại"]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#6D28D9"
              strokeWidth={2}
              fill="url(#convGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
