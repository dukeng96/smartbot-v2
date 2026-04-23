"use client"

import { useState, useCallback } from "react"
import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CopyButtonProps {
  text: string
  className?: string
}

/**
 * Click-to-copy button — copies text to clipboard, shows check icon briefly.
 * Used in C5 (API & Embed) for embed code snippets.
 */
export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback — clipboard API may not be available
    }
  }, [text])

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn(className)}
      onClick={handleCopy}
      aria-label={copied ? "Đã copy" : "Copy"}
    >
      {copied ? (
        <Check className="size-4 text-[#059669]" />
      ) : (
        <Copy className="size-4" />
      )}
    </Button>
  )
}
