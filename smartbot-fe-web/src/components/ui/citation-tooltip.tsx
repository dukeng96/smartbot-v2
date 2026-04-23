"use client";

import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
import type { CitationChunk } from "@/lib/hooks/use-citation-parser";

interface CitationTooltipProps {
  chunk: CitationChunk;
  children: ReactNode;
}

export function CitationTooltip({ chunk, children }: CitationTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>{children}</TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="max-w-96 max-h-72 overflow-y-auto p-3 text-sm"
        >
          {chunk.documentName && (
            <div className="text-xs text-muted-foreground mb-1 font-medium sticky top-0 bg-popover pb-1">
              {chunk.documentName}
              {chunk.breadcrumb && ` > ${chunk.breadcrumb}`}
            </div>
          )}
          <div className="whitespace-pre-wrap break-words leading-relaxed">
            {chunk.content}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
