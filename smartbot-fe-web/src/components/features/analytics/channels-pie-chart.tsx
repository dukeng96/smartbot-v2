"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ChannelBreakdown } from "@/lib/types/analytics"
import { formatNumber } from "@/lib/utils/format-number"

const CHANNEL_COLORS = ["#6D28D9", "#2563EB", "#059669", "#D97706", "#6B7280"]

const CHANNEL_LABELS: Record<string, string> = {
  web: "Web Widget",
  api: "API",
  facebook: "Facebook",
  zalo: "Zalo",
  telegram: "Telegram",
}

interface ChannelsPieChartProps {
  data: ChannelBreakdown[]
}

/**
 * Donut chart — conversations by channel.
 * Used on F1 analytics overview (right column, 40% width).
 */
export function ChannelsPieChart({ data }: ChannelsPieChartProps) {
  const chartData = data.map((d) => ({
    name: CHANNEL_LABELS[d.channel] ?? d.channel,
    value: d.conversations,
  }))

  return (
    <Card className="p-5">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-[14px] font-semibold">Theo kênh</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={index}
                  fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 13,
              }}
              formatter={(value) => [formatNumber(value as number), "Hội thoại"]}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {chartData.map((item, index) => (
            <div key={item.name} className="flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: CHANNEL_COLORS[index % CHANNEL_COLORS.length] }}
              />
              <span className="text-[12px] text-text-secondary">{item.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
