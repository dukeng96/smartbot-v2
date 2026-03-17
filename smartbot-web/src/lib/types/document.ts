/**
 * Document entity — mirrors Prisma Document model.
 * Used across D3 (list), D4 (detail), and document dialogs.
 */
export type DocumentSourceType = "file_upload" | "url_crawl" | "text_input"
export type DocumentStatus = "pending" | "processing" | "completed" | "error"
export type DocumentProcessingStep = "extracting" | "chunking" | "embedding"

export interface KBDocument {
  id: string
  knowledgeBaseId: string
  tenantId: string
  sourceType: DocumentSourceType
  originalName?: string | null
  mimeType?: string | null
  fileSize?: number | null
  storagePath?: string | null
  sourceUrl?: string | null
  markdownStoragePath?: string | null
  status: DocumentStatus
  processingStep?: DocumentProcessingStep | null
  processingProgress: number
  errorMessage?: string | null
  charCount: number
  chunkCount: number
  processingStartedAt?: string | null
  processingCompletedAt?: string | null
  metadata: Record<string, unknown>
  enabled: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface CreateDocumentUrlInput {
  url: string
}

export interface CreateDocumentTextInput {
  content: string
  name?: string
}
