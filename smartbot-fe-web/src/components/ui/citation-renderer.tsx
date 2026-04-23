"use client";

import {
  useCitationParser,
  getChunkByRef,
  type CitationChunk,
} from "@/lib/hooks/use-citation-parser";
import { CitationTooltip } from "./citation-tooltip";
import { cn } from "@/lib/utils";

interface CitationRendererProps {
  content: string;
  chunks: CitationChunk[];
  isStreaming?: boolean;
  className?: string;
}

export function CitationRenderer({
  content,
  chunks,
  isStreaming = false,
  className,
}: CitationRendererProps) {
  const { segments } = useCitationParser(content, isStreaming);

  return (
    <span className={className}>
      {segments.map((segment, i) => {
        if (segment.type === "text") {
          return <span key={i}>{segment.value}</span>;
        }

        const chunk =
          segment.refIndex !== undefined
            ? getChunkByRef(chunks, segment.refIndex)
            : undefined;

        if (!chunk) {
          return (
            <span
              key={i}
              className="text-muted-foreground/50 text-xs"
            >
              {segment.value}
            </span>
          );
        }

        return (
          <CitationTooltip key={i} chunk={chunk}>
            <sup
              className={cn(
                "inline-flex items-center justify-center",
                "min-w-[1.25rem] h-5 px-1 ml-0.5",
                "text-xs font-medium",
                "text-primary bg-primary/10 rounded",
                "cursor-pointer hover:bg-primary/20 transition-colors"
              )}
            >
              {segment.value}
            </sup>
          </CitationTooltip>
        );
      })}
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />
      )}
    </span>
  );
}
