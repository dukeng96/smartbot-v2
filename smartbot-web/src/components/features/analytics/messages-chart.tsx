"use client"

import { format } from "date-fns"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MessageDataPoint } from "@/lib/types/analytics"
import { formatNumber } from "@/lib/utils/format-number"

interface MessagesChartProps {
  data: MessageDataPoint[]
}

/**
 * Line chart — messages over time with user vs assistant breakdown.
 * Used on F1 analytics overview.
 */
export function MessagesChart({ data }: MessagesChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: format(new Date(d.date), "dd/MM"),
  }))

  return (
    <Card className="p-5">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-[14px] font-semibold">
          Tin nhắn theo thời gian
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={formatted}>
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
              formatter={(value, name) => {
                const label = name === "userMessages" ? "Người dùng" : "Assistant"
                return [formatNumber(value as number), label]
              }}
            />
            <Line
              type="monotone"
              dataKey="userMessages"
              stroke="#6D28D9"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="assistantMessages"
              stroke="#2563EB"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
