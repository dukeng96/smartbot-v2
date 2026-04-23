"use client"

import { MessageCircle, X, Send } from "lucide-react"

import type { UpdateWidgetInput } from "@/lib/validations/bot-schemas"
import { cn } from "@/lib/utils"

interface BotWidgetPreviewProps {
  config: UpdateWidgetInput
  botName?: string
}

/**
 * Widget preview — shows collapsed bubble + expanded chat widget.
 * Applies theme, primaryColor, headerText, showPoweredBy from config props.
 */
const FONT_SIZE_MAP: Record<string, string> = { small: "12px", medium: "13px", large: "14px" }

export function BotWidgetPreview({ config, botName }: BotWidgetPreviewProps) {
  const isDark = config.theme === "dark"
  const color = config.primaryColor || "#6D28D9"
  const isRight = config.position !== "bottom-left"
  const headerText = config.displayName || config.headerText || botName || "Trợ lý AI"
  const fontColor = config.fontColor ?? (isDark ? "#F9FAFB" : "#111827")
  const bgColor = config.backgroundColor ?? (isDark ? "#1F2937" : "#FFFFFF")
  const userMsgColor = config.userMessageColor || color
  const botMsgColor = config.botMessageColor ?? (isDark ? "#374151" : "#F3F4F6")
  const family = config.fontFamily ?? undefined
  const msgSize = FONT_SIZE_MAP[config.fontSize ?? ""] ?? "12px"

  return (
    <div className="sticky top-6 space-y-6">
      <h4 className="text-[13px] font-medium text-text-muted">Xem trước</h4>

      {/* Simulated background */}
      <div className="relative rounded-xl border border-border bg-[#F3F4F6] p-6" style={{ minHeight: 480 }}>
        {/* Expanded widget */}
        <div
          className={cn(
            "w-[320px] overflow-hidden rounded-2xl shadow-lg",
            isRight ? "ml-auto" : "mr-auto",
          )}
          style={{ backgroundColor: bgColor, color: fontColor, fontFamily: family }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: color }}>
            <span className="text-[14px] font-semibold text-white">{headerText}</span>
            <X className="size-4 text-white/70" />
          </div>

          {/* Messages */}
          <div className="space-y-3 p-4" style={{ minHeight: 260 }}>
            <div className="flex gap-2">
              <div className="size-6 shrink-0 rounded-full" style={{ backgroundColor: color, opacity: 0.2 }} />
              <div className="max-w-[75%] rounded-xl rounded-tl-sm px-3 py-2" style={{ backgroundColor: botMsgColor, fontSize: msgSize }}>
                Xin chào! Tôi có thể giúp gì cho bạn?
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[75%] rounded-xl rounded-tr-sm px-3 py-2 text-white" style={{ backgroundColor: userMsgColor, fontSize: msgSize }}>
                Tôi muốn biết thêm
              </div>
            </div>
          </div>

          {/* Powered by */}
          {config.showPoweredBy && (
            <div className={cn("text-center text-[10px] py-1", isDark ? "text-gray-500" : "text-text-muted")}>
              Powered by Smartbot
            </div>
          )}

          {/* Input */}
          <div className={cn("border-t px-4 py-3", isDark ? "border-[#374151]" : "border-border")}>
            <div className={cn("flex items-center rounded-lg border px-3 py-2", isDark ? "border-[#374151] bg-[#374151]" : "border-border")}>
              <span className={cn("flex-1 text-[12px]", isDark ? "text-gray-400" : "text-text-muted")}>Nhập tin nhắn...</span>
              <Send className="size-4" style={{ color }} />
            </div>
          </div>
        </div>

        {/* Collapsed bubble */}
        <div
          className={cn("mt-4 flex items-center gap-3", isRight ? "justify-end" : "justify-start")}
        >
          <button
            type="button"
            className="flex size-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
            style={{ backgroundColor: color }}
          >
            <MessageCircle className="size-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
