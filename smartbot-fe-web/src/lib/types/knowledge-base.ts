/**
 * KnowledgeBase entity — mirrors Prisma KnowledgeBase model.
 * Used across D1 (list), D2 (detail), and KB-related dialogs.
 */
export interface KnowledgeBase {
  id: string
  tenantId: string
  name: string
  description?: string | null
  vectorCollection?: string | null
  embeddingModel: string
  chunkSize: number
  chunkOverlap: number
  totalDocuments: number
  totalChars: number
  status: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface CreateKnowledgeBaseInput {
  name: string
  description?: string
  chunkSize?: number
  chunkOverlap?: number
}

export interface UpdateKnowledgeBaseInput {
  name?: string
  description?: string
  chunkSize?: number
  chunkOverlap?: number
}
