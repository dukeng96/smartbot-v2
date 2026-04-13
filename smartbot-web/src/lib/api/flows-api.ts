import { apiGet, apiPatch } from "./client"
import type { Flow, SaveFlowDto, CredentialItem, CustomToolItem } from "@/lib/types/flow"

// TODO(post-MVP): GET /api/v1/flows/node-types — fetch from Python Pydantic schema export
// For MVP, node definitions are maintained client-side in node-definitions.ts

export const flowsApi = {
  getById: (id: string): Promise<Flow> =>
    apiGet(`api/v1/flows/${id}`),

  save: (id: string, body: SaveFlowDto): Promise<Flow> =>
    apiPatch(`api/v1/flows/${id}`, body),

  getCredentials: (): Promise<CredentialItem[]> =>
    apiGet("api/v1/credentials"),

  getCustomTools: (): Promise<CustomToolItem[]> =>
    apiGet("api/v1/custom-tools"),
}
