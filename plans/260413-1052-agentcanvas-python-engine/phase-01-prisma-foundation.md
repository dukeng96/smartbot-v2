# Phase 01 — Prisma Foundation

**Status:** ⬜ pending

## Goal
Add Prisma models for Flow, FlowExecution, Credential, CustomTool. Add `flowId` column to Bot. Migrate DB.

## Files to create/modify

| File | Action |
|---|---|
| `genai-platform-api/prisma/schema.prisma` | Add 4 models + Bot field |
| `genai-platform-api/prisma/migrations/<ts>_add_flow_models/migration.sql` | Auto-gen |

## Schema additions

```prisma
model Flow {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @map("tenant_id") @db.Uuid
  name        String    @db.VarChar(255)
  description String?   @db.Text
  type        String    @default("agentflow") @db.VarChar(32)  // agentflow | chatflow
  flowData    Json      @map("flow_data")                        // { nodes, edges }
  deployed    Boolean   @default(false)
  createdBy   String    @map("created_by") @db.Uuid
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  creator     User      @relation("FlowCreator", fields: [createdBy], references: [id])
  bot         Bot?      // 1:1 via Bot.flowId @unique
  executions  FlowExecution[]

  @@index([tenantId])
  @@index([tenantId, type])
  @@map("flows")
}

model FlowExecution {
  id             String    @id @default(uuid()) @db.Uuid
  flowId         String    @map("flow_id") @db.Uuid
  botId          String?   @map("bot_id") @db.Uuid
  conversationId String?   @map("conversation_id") @db.Uuid
  sessionId      String?   @map("session_id") @db.VarChar(128)
  state          String    @db.VarChar(20)   // INPROGRESS | FINISHED | ERROR | STOPPED | TIMEOUT
  executionData  Json      @map("execution_data")  // [{ nodeId, input, output, duration, error }]
  errorMessage   String?   @map("error_message") @db.Text
  tokensUsed     Int       @default(0) @map("tokens_used")
  startedAt      DateTime  @default(now()) @map("started_at")
  finishedAt     DateTime? @map("finished_at")

  flow           Flow           @relation(fields: [flowId], references: [id], onDelete: Cascade)
  conversation   Conversation?  @relation(fields: [conversationId], references: [id])

  @@index([flowId, state])
  @@index([conversationId])
  @@map("flow_executions")
}

model Credential {
  id             String   @id @default(uuid()) @db.Uuid
  tenantId       String   @map("tenant_id") @db.Uuid
  name           String   @db.VarChar(128)         // user-friendly label
  credentialType String   @map("credential_type") @db.VarChar(64)  // openAI | anthropic | vnpt | qdrant | tavily | ...
  encryptedData  Bytes    @map("encrypted_data")   // AES-256-GCM ciphertext
  iv             Bytes    @db.ByteA                // 12 bytes GCM nonce
  authTag        Bytes    @map("auth_tag") @db.ByteA  // 16 bytes GCM tag
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  tenant         Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, name])
  @@index([tenantId, credentialType])
  @@map("credentials")
}

model CustomTool {
  id             String   @id @default(uuid()) @db.Uuid
  tenantId       String   @map("tenant_id") @db.Uuid
  name           String   @db.VarChar(128)         // user-friendly label, unique per tenant
  description    String?  @db.Text                 // shown to Agent LLM as tool description
  schema         Json                               // JSON Schema for tool args (validated at bind time)
  implementation String   @db.Text                  // RestrictedPython source code
  createdBy      String   @map("created_by") @db.Uuid
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  tenant         Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  creator        User     @relation("CustomToolCreator", fields: [createdBy], references: [id])

  @@unique([tenantId, name])
  @@index([tenantId])
  @@map("custom_tools")
}

// Hard cap: 50 CustomTool rows per tenant (enforced at API layer, matches credential cap).

// Add to existing Bot model:
model Bot {
  // ... existing fields
  flowId    String   @unique @map("flow_id") @db.Uuid   // 1:1 with Flow, required
  flow      Flow     @relation(fields: [flowId], references: [id], onDelete: Restrict)
  // ... rest
}

// Note: Flow entity does NOT back-reference Bot[] (1:1 enforced via @unique on Bot.flowId).
// To find the bot for a flow: `prisma.bot.findUnique({ where: { flowId } })`

// Add inverse relations to Tenant and User models
```

## Steps

1. **Wipe existing bots first** — `DELETE FROM bots;` (all envs). No pre-agentcanvas bot state retained.
2. Edit `schema.prisma` — add 4 models (Flow, FlowExecution, Credential, CustomTool), Bot.flowId (non-null + unique), inverse relations on Tenant/User/Conversation
3. `cd genai-platform-api && npx prisma migrate dev --name add_flow_models`
4. `npx prisma generate`
5. Verify in psql: `\dt flows`, `\dt flow_executions`, `\dt credentials`, `\dt custom_tools`
6. Check Bot.flow_id column exists, NOT NULL, FK to flows(id), unique index

## Success criteria

- [ ] Migration applies cleanly on fresh DB (existing bots wiped pre-migration)
- [ ] `npx prisma studio` shows 4 new tables (flows, flow_executions, credentials, custom_tools)
- [ ] Bot.flowId NOT NULL + unique — bot creation without flowId rejected at DB level
- [ ] Cascade delete works: deleting Tenant removes its Flows + Credentials + CustomTools
- [ ] Flow delete blocked if a Bot references it (`onDelete: Restrict`)
- [ ] Unit test: create Flow + 1 FlowExecution, query both back
- [ ] Unit test: create CustomTool with JSON Schema, query back, verify `@@unique(tenantId, name)` rejects duplicates

## Risks

- Bytes field in Prisma (bytea in PG) — confirm Prisma 7 supports it (it does via `Bytes`)
- Destructive migration — all existing bots deleted before NOT NULL constraint applied. Confirmed with product owner.

## Out of scope (defer)

- Flow versioning (phase 2)
- Soft delete on Flow (use hard delete for MVP)
- Audit log on Credential access
