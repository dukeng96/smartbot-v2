"use client"

import { ThumbsUp, ThumbsDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ChatMessageFeedbackProps {
  messageId: string
  convId: string
  currentFeedback: "thumbs_up" | "thumbs_down" | null
  onFeedback: (vars: {
    msgId: string
    convId: string
    feedback: "thumbs_up" | "thumbs_down"
  }) => void
}

/**
 * Thumbs up / down feedback buttons below assistant messages.
 */
export function ChatMessageFeedback({
  messageId,
  convId,
  currentFeedback,
  onFeedback,
}: ChatMessageFeedbackProps) {
  return (
    <div className="flex items-center gap-1 mt-1">
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn(
          "size-7",
          currentFeedback === "thumbs_up" && "text-[#059669] bg-[#ECFDF5]",
        )}
        onClick={() =>
          onFeedback({ msgId: messageId, convId, feedback: "thumbs_up" })
        }
        aria-label="Phản hồi tích cực"
      >
        <ThumbsUp className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn(
          "size-7",
          currentFeedback === "thumbs_down" && "text-[#DC2626] bg-[#FEF2F2]",
        )}
        onClick={() =>
          onFeedback({ msgId: messageId, convId, feedback: "thumbs_down" })
        }
        aria-label="Phản hồi tiêu cực"
      >
        <ThumbsDown className="size-3.5" />
      </Button>
    </div>
  )
}
