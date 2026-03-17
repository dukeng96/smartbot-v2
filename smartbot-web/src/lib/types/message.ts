/**
 * Chat message within a conversation.
 * Includes optional RAG retrieval context for assistant messages.
 */
export interface Message {
  id: string
  conversationId: string
  role: "user" | "assistant" | "system"
  content: string
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  creditsUsed: number | null
  searchQuery: string | null
  retrievalContext: RetrievalChunk[] | null
  responseTimeMs: number | null
  modelUsed: string | null
  feedback: "thumbs_up" | "thumbs_down" | null
  createdAt: string
}

/** Single chunk from RAG retrieval for debug panel */
export interface RetrievalChunk {
  documentName: string
  content: string
  relevanceScore: number
}
