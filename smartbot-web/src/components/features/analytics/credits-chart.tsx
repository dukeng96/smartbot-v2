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
import type { CreditDataPoint } from "@/lib/types/analytics"
import { formatNumber } from "@/lib/utils/format-number"

interface CreditsChartProps {
  data: CreditDataPoint[]
}

/**
 * Area chart — credit usage over time.
 * Used on F1 analytics overview bottom section.
 */
export function CreditsChart({ data }: CreditsChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: format(new Date(d.date), "dd/MM"),
  }))

  return (
    <Card className="p-5">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-[14px] font-semibold">
          Credits sử dụng
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={formatted}>
            <defs>
              <linearGradient id="creditGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
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
              formatter={(value) => [formatNumber(value as number), "Credits"]}
            />
            <Area
              type="monotone"
              dataKey="creditsUsed"
              stroke="#059669"
              strokeWidth={2}
              fill="url(#creditGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
