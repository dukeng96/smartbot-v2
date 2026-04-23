import { useMemo } from "react";

export interface CitationChunk {
  refIndex: number;
  content: string;
  documentName?: string;
  breadcrumb?: string;
}

export interface ParsedSegment {
  type: "text" | "citation";
  value: string;
  refIndex?: number;
}

interface UseCitationParserResult {
  segments: ParsedSegment[];
  pendingBuffer: string;
}

/**
 * Parse content with <cite chunk_id="refX"/> tags into segments.
 * Handles streaming by detecting incomplete tags at end of content.
 */
export function useCitationParser(
  content: string,
  isStreaming: boolean = false
): UseCitationParserResult {
  const result = useMemo(() => {
    return parseCitations(content, isStreaming);
  }, [content, isStreaming]);

  return result;
}

/**
 * Pure function to parse citations - can be used outside of React.
 */
export function parseCitations(
  content: string,
  isStreaming: boolean = false
): UseCitationParserResult {
  let processContent = content;
  let pendingBuffer = "";

  // During streaming, check for incomplete cite tag at end
  if (isStreaming) {
    const incompleteMatch = content.match(/<cite[^>]*$/);
    if (incompleteMatch && incompleteMatch.index !== undefined) {
      pendingBuffer = content.slice(incompleteMatch.index);
      processContent = content.slice(0, incompleteMatch.index);
    }
  }

  const segments: ParsedSegment[] = [];
  // Match both <cite chunk_id="refX"/> and <cite chunk_id="refX">
  const citeRegex = /<cite\s+chunk_id="ref(\d+)"(?:\s*\/)?\s*>/g;

  let lastIndex = 0;
  let match;

  while ((match = citeRegex.exec(processContent)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      const text = processContent.slice(lastIndex, match.index);
      if (text) {
        segments.push({ type: "text", value: text });
      }
    }

    // Add citation (1-indexed for display)
    const refIndex = parseInt(match[1], 10);
    segments.push({
      type: "citation",
      value: `[${refIndex + 1}]`,
      refIndex,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < processContent.length) {
    segments.push({
      type: "text",
      value: processContent.slice(lastIndex),
    });
  }

  return { segments, pendingBuffer };
}

/**
 * Get chunk by ref index from chunks array.
 */
export function getChunkByRef(
  chunks: CitationChunk[],
  refIndex: number
): CitationChunk | undefined {
  return chunks.find((c) => c.refIndex === refIndex);
}
