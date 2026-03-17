import type { PaginatedResponse, ListParams } from "@/lib/types/api-responses"
import type { KnowledgeBase } from "@/lib/types/knowledge-base"
import { apiGet } from "./client"

export const knowledgeBasesApi = {
  list: (params?: ListParams) =>
    apiGet<PaginatedResponse<KnowledgeBase>>(
      "api/v1/knowledge-bases",
      params as Record<string, string | number | boolean | undefined>,
    ),
}
