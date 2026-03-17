export interface KnowledgeBase {
  id: string
  name: string
  description: string | null
  totalDocuments: number
  totalChars: number
  status: string
  createdAt: string
}
