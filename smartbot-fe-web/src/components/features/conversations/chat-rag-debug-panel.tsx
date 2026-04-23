"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, FileText } from "lucide-react"

import type { Message } from "@/lib/types/message"
import { cn } from "@/lib/utils"

interface ChatRagDebugPanelProps {
  message: Message
}

/**
 * Expandable RAG debug section for assistant messages.
 * Shows search query, retrieval sources, model, tokens, credits.
 */
export function ChatRagDebugPanel({ message }: ChatRagDebugPanelProps) {
  const [expanded, setExpanded] = useState(false)

  const hasDebugInfo =
    message.searchQuery ||
    (message.retrievalContext && message.retrievalContext.length > 0) ||
    message.modelUsed ||
    message.totalTokens

  if (!hasDebugInfo) return null

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-secondary transition-colors"
      >
        {expanded ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
        Sources & Debug
      </button>

      {expanded && (
        <div className="mt-2 rounded-lg border border-border bg-[#F9FAFB] p-3 space-y-2 text-[12px]">
          {message.searchQuery && (
            <div>
              <span className="font-medium text-text-secondary">Query: </span>
              <span className="text-text-body">{message.searchQuery}</span>
            </div>
          )}

          {message.retrievalContext &&
            message.retrievalContext.length > 0 && (
              <div className="space-y-1.5">
                <span className="font-medium text-text-secondary">
                  Sources:
                </span>
                {message.retrievalContext.map((chunk, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded border border-border-light bg-white p-2"
                  >
                    <FileText className="mt-0.5 size-3.5 shrink-0 text-text-muted" />
                    <div className="min-w-0">
                      <p className="font-medium text-text-body truncate">
                        {chunk.documentName}
                      </p>
                      <p className="mt-0.5 text-text-muted line-clamp-2">
                        {chunk.content}
                      </p>
                      <p className="mt-0.5 text-text-muted">
                        Relevance: {(chunk.relevanceScore * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

          <div className={cn("flex flex-wrap gap-x-4 gap-y-1 text-text-muted")}>
            {message.modelUsed && <span>Model: {message.modelUsed}</span>}
            {message.totalTokens != null && (
              <span>Tokens: {message.totalTokens.toLocaleString("vi-VN")}</span>
            )}
            {message.creditsUsed != null && (
              <span>Credits: {message.creditsUsed}</span>
            )}
            {message.responseTimeMs != null && (
              <span>{message.responseTimeMs}ms</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
