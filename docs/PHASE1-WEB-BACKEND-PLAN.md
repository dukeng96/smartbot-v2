# PHASE 1: Web Backend Platform — Execution Plan

> **Mục tiêu:** Xây dựng toàn bộ backend web cho GenAI Assistant Platform — auth, bot management, knowledge base CRUD, billing, analytics, channel management, embed script generation. KHÔNG bao gồm AI processing (OCR, chunking, embedding, RAG, LLM). AI Engine sẽ là 1 service riêng giao tiếp qua internal HTTP API.

---

## 1. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20 LTS |
| Framework | NestJS | v10+ |
| Language | TypeScript | 5.x strict mode |
| ORM | Prisma | v6+ |
| Database | PostgreSQL | 16 |
| Cache/Queue | Redis + BullMQ | Redis 7, BullMQ 5 |
| Auth | JWT (access + refresh) + bcrypt | |
| Validation | class-validator + class-transformer | |
| API Docs | Swagger/OpenAPI via @nestjs/swagger | |
| File Upload | Multer + S3 (MinIO compatible) | |
| Payment | VNPay SDK, MoMo API (stub initially) | |
| Testing | Jest + Supertest | |
| Containerization | Docker + docker-compose | |

**Lý do chọn NestJS:** Module-based architecture phù hợp SaaS multi-module, built-in DI, Guards cho auth/quota middleware, tích hợp Swagger tốt, ecosystem lớn. Team backend VN quen thuộc.

---

## 2. Project Structure

```
genai-platform-api/
├── docker-compose.yml              # PostgreSQL + Redis + MinIO + API
├── .env.example
├── prisma/
│   ├── schema.prisma               # Toàn bộ data model
│   └── seed.ts                     # Seed plans, admin user
├── src/
│   ├── main.ts                     # Bootstrap NestJS
│   ├── app.module.ts               # Root module
│   ├── common/
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── tenant.guard.ts     # Extract tenant_id from JWT, inject vào request
│   │   │   └── quota.guard.ts      # Check subscription + credit limits
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── current-tenant.decorator.ts
│   │   ├── interceptors/
│   │   │   └── transform.interceptor.ts  # Wrap response {data, meta}
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── dto/
│   │   │   └── pagination.dto.ts   # page, limit, sort
│   │   └── utils/
│   │       ├── crypto.ts           # Hash API keys, generate tokens
│   │       └── slug.ts             # Generate URL-safe slugs
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── google.strategy.ts
│   │   │   └── dto/
│   │   │       ├── register.dto.ts
│   │   │       ├── login.dto.ts
│   │   │       └── reset-password.dto.ts
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   └── users.service.ts
│   │   ├── tenants/
│   │   │   ├── tenants.module.ts
│   │   │   ├── tenants.controller.ts
│   │   │   ├── tenants.service.ts
│   │   │   └── dto/
│   │   ├── bots/
│   │   │   ├── bots.module.ts
│   │   │   ├── bots.controller.ts
│   │   │   ├── bots.service.ts
│   │   │   └── dto/
│   │   │       ├── create-bot.dto.ts
│   │   │       ├── update-bot.dto.ts
│   │   │       ├── update-personality.dto.ts
│   │   │       └── update-widget.dto.ts
│   │   ├── knowledge-bases/
│   │   │   ├── knowledge-bases.module.ts
│   │   │   ├── knowledge-bases.controller.ts
│   │   │   ├── knowledge-bases.service.ts
│   │   │   ├── documents.controller.ts  # Nested under KB
│   │   │   ├── documents.service.ts
│   │   │   └── dto/
│   │   ├── channels/
│   │   │   ├── channels.module.ts
│   │   │   ├── channels.controller.ts
│   │   │   ├── channels.service.ts
│   │   │   ├── webhooks.controller.ts   # FB/Telegram/Zalo webhook receivers
│   │   │   └── dto/
│   │   ├── conversations/
│   │   │   ├── conversations.module.ts
│   │   │   ├── conversations.controller.ts
│   │   │   ├── conversations.service.ts
│   │   │   ├── messages.service.ts
│   │   │   └── dto/
│   │   ├── analytics/
│   │   │   ├── analytics.module.ts
│   │   │   ├── analytics.controller.ts
│   │   │   └── analytics.service.ts
│   │   ├── billing/
│   │   │   ├── billing.module.ts
│   │   │   ├── billing.controller.ts
│   │   │   ├── billing.service.ts
│   │   │   ├── plans.controller.ts
│   │   │   ├── credits.service.ts
│   │   │   ├── payment-gateways/
│   │   │   │   ├── vnpay.service.ts     # VNPay IPN handler
│   │   │   │   └── momo.service.ts      # MoMo IPN handler (stub)
│   │   │   └── dto/
│   │   ├── chat-proxy/
│   │   │   ├── chat-proxy.module.ts
│   │   │   ├── chat-proxy.controller.ts # Public chat API for widget/channels
│   │   │   └── chat-proxy.service.ts    # Proxy SSE from AI Engine → client
│   │   └── storage/
│   │       ├── storage.module.ts
│   │       └── storage.service.ts       # S3/MinIO upload/download
│   └── config/
│       ├── database.config.ts
│       ├── redis.config.ts
│       ├── s3.config.ts
│       └── app.config.ts
└── test/
    ├── auth.e2e-spec.ts
    ├── bots.e2e-spec.ts
    └── billing.e2e-spec.ts
```

---

## 3. Prisma Schema (Complete)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== AUTH & USERS ====================

model User {
  id              String    @id @default(uuid()) @db.Uuid
  email           String    @unique @db.VarChar(255)
  passwordHash    String?   @map("password_hash") @db.VarChar(255)
  fullName        String?   @map("full_name") @db.VarChar(255)
  avatarUrl       String?   @map("avatar_url")
  phone           String?   @db.VarChar(20)
  emailVerified   Boolean   @default(false) @map("email_verified")
  authProvider    String    @default("email") @map("auth_provider") @db.VarChar(20)
  authProviderId  String?   @map("auth_provider_id") @db.VarChar(255)
  lastLoginAt     DateTime? @map("last_login_at")
  status          String    @default("active") @db.VarChar(20)
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  ownedTenants    Tenant[]        @relation("TenantOwner")
  memberships     TenantMember[]
  refreshTokens   RefreshToken[]

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  token     String   @unique @db.VarChar(500)
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}

// ==================== TENANTS ====================

model Tenant {
  id        String    @id @default(uuid()) @db.Uuid
  name      String    @db.VarChar(255)
  slug      String    @unique @db.VarChar(100)
  ownerId   String    @map("owner_id") @db.Uuid
  logoUrl   String?   @map("logo_url")
  planId    String?   @map("plan_id") @db.Uuid
  status    String    @default("active") @db.VarChar(20)
  settings  Json      @default("{}")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  owner          User              @relation("TenantOwner", fields: [ownerId], references: [id])
  plan           Plan?             @relation(fields: [planId], references: [id])
  members        TenantMember[]
  bots           Bot[]
  knowledgeBases KnowledgeBase[]
  documents      Document[]
  conversations  Conversation[]
  messages       Message[]
  channels       Channel[]
  subscriptions  Subscription[]
  creditUsages   CreditUsage[]
  payments       PaymentHistory[]

  @@index([slug])
  @@index([ownerId])
  @@map("tenants")
}

model TenantMember {
  id        String    @id @default(uuid()) @db.Uuid
  tenantId  String    @map("tenant_id") @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  role      String    @default("member") @db.VarChar(20) // owner | admin | member | viewer
  invitedAt DateTime  @default(now()) @map("invited_at")
  joinedAt  DateTime? @map("joined_at")
  status    String    @default("active") @db.VarChar(20) // active | invited | removed
  createdAt DateTime  @default(now()) @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tenantId, userId])
  @@index([tenantId])
  @@index([userId])
  @@map("tenant_members")
}

// ==================== BOTS ====================

model Bot {
  id                    String    @id @default(uuid()) @db.Uuid
  tenantId              String    @map("tenant_id") @db.Uuid
  name                  String    @db.VarChar(255)
  description           String?
  avatarUrl             String?   @map("avatar_url")
  status                String    @default("draft") @db.VarChar(20) // draft | active | paused | archived

  // Personality & Behavior
  systemPrompt          String?   @map("system_prompt")
  greetingMessage       String?   @map("greeting_message")
  suggestedQuestions    Json      @default("[]") @map("suggested_questions") // ["Q1", "Q2", ...]
  personality           Json      @default("{}") // {tone, language, restrictions}
  fallbackMessage       String?   @map("fallback_message")

  // RAG Config (user-configurable)
  topK                  Int       @default(5) @map("top_k") // 1-20
  memoryTurns           Int       @default(5) @map("memory_turns") // 1-20

  // Widget Appearance
  widgetConfig          Json      @default("{}") @map("widget_config")
  // {theme, primary_color, position, bubble_icon, show_powered_by, custom_css, header_text}

  // Limits
  maxKnowledgeChars     BigInt?   @map("max_knowledge_chars")
  currentKnowledgeChars BigInt    @default(0) @map("current_knowledge_chars")

  // API access
  apiKeyHash            String?   @map("api_key_hash") @db.VarChar(255)
  apiKeyPrefix          String?   @map("api_key_prefix") @db.VarChar(10)

  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")
  deletedAt             DateTime? @map("deleted_at")

  tenant         Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  knowledgeBases BotKnowledgeBase[]
  conversations  Conversation[]
  messages       Message[]
  channels       Channel[]

  @@index([tenantId])
  @@map("bots")
}

model BotKnowledgeBase {
  botId           String @map("bot_id") @db.Uuid
  knowledgeBaseId String @map("knowledge_base_id") @db.Uuid
  priority        Int    @default(0)
  createdAt       DateTime @default(now()) @map("created_at")

  bot           Bot           @relation(fields: [botId], references: [id], onDelete: Cascade)
  knowledgeBase KnowledgeBase @relation(fields: [knowledgeBaseId], references: [id], onDelete: Cascade)

  @@id([botId, knowledgeBaseId])
  @@map("bot_knowledge_bases")
}

// ==================== KNOWLEDGE BASE & DOCUMENTS ====================

model KnowledgeBase {
  id               String    @id @default(uuid()) @db.Uuid
  tenantId         String    @map("tenant_id") @db.Uuid
  name             String    @db.VarChar(255)
  description      String?
  vectorCollection String?   @map("vector_collection") @db.VarChar(100) // "kb_{id}"
  embeddingModel   String    @default("vnpt-bge-m3") @map("embedding_model") @db.VarChar(100)
  chunkSize        Int       @default(500) @map("chunk_size")
  chunkOverlap     Int       @default(50) @map("chunk_overlap")
  totalDocuments   Int       @default(0) @map("total_documents")
  totalChars       BigInt    @default(0) @map("total_chars")
  status           String    @default("active") @db.VarChar(20) // active | processing | error
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")
  deletedAt        DateTime? @map("deleted_at")

  tenant    Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  documents Document[]
  bots      BotKnowledgeBase[]

  @@index([tenantId])
  @@map("knowledge_bases")
}

model Document {
  id                     String    @id @default(uuid()) @db.Uuid
  knowledgeBaseId        String    @map("knowledge_base_id") @db.Uuid
  tenantId               String    @map("tenant_id") @db.Uuid

  // Source info
  sourceType             String    @map("source_type") @db.VarChar(20) // file_upload | url_crawl | text_input
  originalName           String?   @map("original_name") @db.VarChar(500)
  mimeType               String?   @map("mime_type") @db.VarChar(100)
  fileSize               BigInt?   @map("file_size")
  storagePath            String?   @map("storage_path")
  sourceUrl              String?   @map("source_url")
  markdownStoragePath    String?   @map("markdown_storage_path") // S3 path cho extracted markdown (dùng để re-chunk)

  // Processing
  status                 String    @default("pending") @db.VarChar(20) // pending | processing | completed | error
  processingStep         String?   @map("processing_step") @db.VarChar(30) // extracting | chunking | embedding
  processingProgress     Int       @default(0) @map("processing_progress") // 0-100
  errorMessage           String?   @map("error_message")
  charCount              BigInt    @default(0) @map("char_count")
  chunkCount             Int       @default(0) @map("chunk_count")
  processingStartedAt    DateTime? @map("processing_started_at")
  processingCompletedAt  DateTime? @map("processing_completed_at")

  // Metadata
  metadata               Json      @default("{}")
  enabled                Boolean   @default(true)

  createdAt              DateTime  @default(now()) @map("created_at")
  updatedAt              DateTime  @updatedAt @map("updated_at")
  deletedAt              DateTime? @map("deleted_at")

  knowledgeBase KnowledgeBase @relation(fields: [knowledgeBaseId], references: [id], onDelete: Cascade)
  tenant        Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([knowledgeBaseId])
  @@index([tenantId])
  @@map("documents")
}

// ==================== CONVERSATIONS & MESSAGES ====================

model Conversation {
  id                     String    @id @default(uuid()) @db.Uuid
  botId                  String    @map("bot_id") @db.Uuid
  tenantId               String    @map("tenant_id") @db.Uuid

  // End-user (person chatting with the bot, NOT platform user)
  endUserId              String?   @map("end_user_id") @db.VarChar(255)
  endUserName            String?   @map("end_user_name") @db.VarChar(255)
  endUserEmail           String?   @map("end_user_email") @db.VarChar(255)
  endUserMetadata        Json      @default("{}") @map("end_user_metadata")

  // Channel
  channel                String    @default("web_widget") @db.VarChar(20)
  channelConversationId  String?   @map("channel_conversation_id") @db.VarChar(255)

  // State
  status                 String    @default("active") @db.VarChar(20) // active | closed | archived
  messageCount           Int       @default(0) @map("message_count")
  lastMessageAt          DateTime? @map("last_message_at")

  // Feedback
  rating                 Int?      @db.SmallInt // 1-5
  feedbackText           String?   @map("feedback_text")

  createdAt              DateTime  @default(now()) @map("created_at")
  updatedAt              DateTime  @updatedAt @map("updated_at")

  bot      Bot       @relation(fields: [botId], references: [id], onDelete: Cascade)
  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  messages Message[]

  @@index([botId])
  @@index([tenantId])
  @@index([botId, createdAt(sort: Desc)])
  @@index([endUserId])
  @@map("conversations")
}

model Message {
  id               String   @id @default(uuid()) @db.Uuid
  conversationId   String   @map("conversation_id") @db.Uuid
  botId            String   @map("bot_id") @db.Uuid
  tenantId         String   @map("tenant_id") @db.Uuid

  role             String   @db.VarChar(10) // user | assistant | system
  content          String

  // Token & cost
  inputTokens      Int?     @map("input_tokens")
  outputTokens     Int?     @map("output_tokens")
  totalTokens      Int?     @map("total_tokens")
  creditsUsed      Decimal  @default(0) @map("credits_used") @db.Decimal(10, 4)

  // RAG debug
  searchQuery      String?  @map("search_query") // Rewritten search query
  retrievalContext Json?    @map("retrieval_context") // [{doc_id, chunk_id, score, text_preview}]

  // Response
  responseTimeMs   Int?     @map("response_time_ms")
  modelUsed        String?  @map("model_used") @db.VarChar(100)

  // Feedback
  feedback         String?  @db.VarChar(10) // thumbs_up | thumbs_down

  createdAt        DateTime @default(now()) @map("created_at")

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  bot          Bot          @relation(fields: [botId], references: [id], onDelete: Cascade)
  tenant       Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
  @@index([botId, createdAt(sort: Desc)])
  @@index([tenantId, createdAt(sort: Desc)])
  @@map("messages")
}

// ==================== CHANNELS ====================

model Channel {
  id           String    @id @default(uuid()) @db.Uuid
  botId        String    @map("bot_id") @db.Uuid
  tenantId     String    @map("tenant_id") @db.Uuid
  type         String    @db.VarChar(30) // web_widget | facebook_messenger | telegram | zalo | api
  status       String    @default("active") @db.VarChar(20)
  config       Json      @default("{}")
  connectedAt  DateTime? @map("connected_at")
  lastActiveAt DateTime? @map("last_active_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  bot    Bot    @relation(fields: [botId], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([botId])
  @@map("channels")
}

// ==================== BILLING ====================

model Plan {
  id                       String  @id @default(uuid()) @db.Uuid
  name                     String  @db.VarChar(100) // Free | Starter | Advanced | Pro
  slug                     String  @unique @db.VarChar(50)
  description              String?
  isActive                 Boolean @default(true) @map("is_active")

  // Limits
  maxBots                  Int     @map("max_bots") // -1 = unlimited
  maxCreditsPerMonth       Int     @map("max_credits_per_month")
  maxKnowledgeCharsPerBot  BigInt  @map("max_knowledge_chars_per_bot")
  maxTeamMembers           Int     @default(1) @map("max_team_members")

  // Feature flags
  features                 Json    @default("{}") // {analytics, voice_input, save_conversations, ...}

  // Pricing VND
  priceMonthly             BigInt  @default(0) @map("price_monthly")
  priceYearly              BigInt  @default(0) @map("price_yearly")
  priceWeekly              BigInt  @default(0) @map("price_weekly")

  sortOrder                Int     @default(0) @map("sort_order")
  createdAt                DateTime @default(now()) @map("created_at")
  updatedAt                DateTime @updatedAt @map("updated_at")

  tenants       Tenant[]
  subscriptions Subscription[]

  @@map("plans")
}

model Subscription {
  id                    String   @id @default(uuid()) @db.Uuid
  tenantId              String   @map("tenant_id") @db.Uuid
  planId                String   @map("plan_id") @db.Uuid
  status                String   @default("active") @db.VarChar(20) // active | past_due | cancelled | trialing
  billingCycle          String   @map("billing_cycle") @db.VarChar(10) // weekly | monthly | yearly
  currentPeriodStart    DateTime @map("current_period_start")
  currentPeriodEnd      DateTime @map("current_period_end")
  cancelAtPeriodEnd     Boolean  @default(false) @map("cancel_at_period_end")
  paymentMethod         String?  @map("payment_method") @db.VarChar(30)
  externalSubscriptionId String? @map("external_subscription_id") @db.VarChar(255)
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  plan   Plan   @relation(fields: [planId], references: [id])

  @@index([tenantId])
  @@map("subscriptions")
}

model CreditUsage {
  id               String   @id @default(uuid()) @db.Uuid
  tenantId         String   @map("tenant_id") @db.Uuid
  periodStart      DateTime @map("period_start") @db.Date
  periodEnd        DateTime @map("period_end") @db.Date
  creditsAllocated Int      @map("credits_allocated")
  creditsUsed      Int      @default(0) @map("credits_used")
  topUpCredits     Int      @default(0) @map("top_up_credits")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, periodStart])
  @@map("credit_usage")
}

model PaymentHistory {
  id                    String   @id @default(uuid()) @db.Uuid
  tenantId              String   @map("tenant_id") @db.Uuid
  subscriptionId        String?  @map("subscription_id") @db.Uuid
  type                  String   @db.VarChar(20) // subscription | top_up | refund
  amount                BigInt   // VND
  currency              String   @default("VND") @db.VarChar(3)
  status                String   @default("pending") @db.VarChar(20)
  paymentMethod         String?  @map("payment_method") @db.VarChar(30)
  gatewayTransactionId  String?  @map("gateway_transaction_id") @db.VarChar(255)
  gatewayResponse       Json?    @map("gateway_response")
  description           String?
  createdAt             DateTime @default(now()) @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, createdAt(sort: Desc)])
  @@map("payment_history")
}
```

---

## 4. API Routes — Complete Specification

### 4.1 Auth (`/api/v1/auth`)

| Method | Path | Description | Auth | Body/Params |
|--------|------|-------------|------|-------------|
| POST | `/register` | Register with email+password. Auto-create tenant. | Public | `{email, password, fullName}` → `{user, tenant, accessToken, refreshToken}` |
| POST | `/login` | Login → JWT pair | Public | `{email, password}` → `{accessToken, refreshToken}` |
| POST | `/logout` | Revoke refresh token | JWT | `{refreshToken}` |
| POST | `/refresh` | New access token from refresh | Public | `{refreshToken}` → `{accessToken, refreshToken}` |
| POST | `/forgot-password` | Send reset email (stub: log token) | Public | `{email}` |
| POST | `/reset-password` | Reset with token | Public | `{token, newPassword}` |
| POST | `/verify-email` | Verify email token | Public | `{token}` |
| POST | `/oauth/google` | Google OAuth callback | Public | `{idToken}` → `{accessToken, refreshToken}` |

**JWT payload:** `{userId, tenantId, role, iat, exp}`. Access token TTL: 15min. Refresh: 7 days.

**Register flow:** Create User → Create Tenant (name=user's name + "'s workspace", slug=auto) → Create TenantMember(role=owner) → Assign Free plan → Create initial CreditUsage record → Return tokens.

### 4.2 Users (`/api/v1/users`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Current user profile |
| PATCH | `/me` | Update profile `{fullName, avatarUrl, phone}` |

### 4.3 Tenants (`/api/v1/tenants`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:id` | Tenant details (must be member) |
| PATCH | `/:id` | Update name, logo, settings (admin+) |
| GET | `/:id/members` | List members |
| POST | `/:id/members` | Invite `{email, role}` → create User if not exists, TenantMember(status=invited) |
| PATCH | `/:id/members/:userId` | Change role (owner only) |
| DELETE | `/:id/members/:userId` | Remove member |

### 4.4 Bots (`/api/v1/bots`)

All routes require JWT + tenant_id extracted from token.

| Method | Path | Description | Notes |
|--------|------|-------------|-------|
| POST | `/` | Create bot | Check quota: bot count < plan.maxBots. Body: `{name, description}`. Auto-set status=draft |
| GET | `/` | List bots | Paginated, filter by status. Exclude deleted. |
| GET | `/:id` | Bot detail + all config | Include knowledgeBases, channels count |
| PATCH | `/:id` | Update bot | Partial update. Validate topK 1-20, memoryTurns 1-20 |
| DELETE | `/:id` | Soft delete | Set deletedAt. Don't delete conversations. |
| POST | `/:id/duplicate` | Clone bot | Copy config, KB links. New name = original + " (copy)" |
| PATCH | `/:id/personality` | Update personality | `{systemPrompt, greetingMessage, suggestedQuestions, fallbackMessage, personality}` |
| GET | `/:id/personality` | Get personality config | |
| PATCH | `/:id/widget` | Update widget config | `{theme, primaryColor, position, bubbleIcon, showPoweredBy, customCss, headerText}` |
| GET | `/:id/widget/preview` | Preview widget as HTML | Return rendered HTML snippet |
| POST | `/:id/api-key` | Generate API key | Return key ONCE. Store SHA-256 hash. |
| DELETE | `/:id/api-key` | Revoke API key | Null out apiKeyHash |
| GET | `/:id/embed-code` | Get embed snippets | Return `{iframe, bubble, directLink}` |
| POST | `/:id/knowledge-bases` | Attach KB to bot | `{knowledgeBaseId, priority}` |
| DELETE | `/:id/knowledge-bases/:kbId` | Detach KB | |
| GET | `/:id/knowledge-bases` | List attached KBs | |

### 4.5 Knowledge Bases (`/api/v1/knowledge-bases`)

| Method | Path | Description | Notes |
|--------|------|-------------|-------|
| POST | `/` | Create KB | Auto-set vectorCollection = `kb_{id}`. Body: `{name, description, chunkSize?, chunkOverlap?}` |
| GET | `/` | List KBs | With document counts |
| GET | `/:id` | KB detail + stats | totalDocs, totalChars, status |
| PATCH | `/:id` | Update config | `{name, description, chunkSize, chunkOverlap}` |
| DELETE | `/:id` | Delete KB | Soft delete. **Call AI Engine to delete Qdrant collection.** |
| POST | `/:id/reprocess-all` | Re-chunk all docs | Queue job for each doc |

**Documents (nested under KB):**

| Method | Path | Description | Notes |
|--------|------|-------------|-------|
| POST | `/:id/documents/upload` | Upload file(s) | Multer multipart. Save to S3. Create Document record(status=pending). **Queue job → call AI Engine `/engine/v1/documents/process`** |
| POST | `/:id/documents/url` | Crawl URL | Create Document(sourceType=url_crawl, sourceUrl=url, status=pending). **Queue job → call AI Engine** |
| POST | `/:id/documents/text` | Raw text input | Create Document(sourceType=text_input). **Queue job → call AI Engine** |
| GET | `/:id/documents` | List documents | Paginated. Include status, charCount, chunkCount |
| GET | `/:id/documents/:docId` | Document detail | |
| DELETE | `/:id/documents/:docId` | Delete document | Soft delete. **Call AI Engine to delete vectors.** Update KB totals. |
| PATCH | `/:id/documents/:docId` | Toggle enabled, update metadata | |
| POST | `/:id/documents/:docId/reprocess` | Re-process single doc | Queue job |

**AI Engine integration pattern (for document operations):**
```typescript
// documents.service.ts
async uploadDocument(kbId: string, file: Express.Multer.File) {
  // 1. Upload file to S3
  const storagePath = await this.storage.upload(file);
  
  // 2. Create Document record
  const doc = await this.prisma.document.create({...});
  
  // 3. Queue async processing job
  await this.documentQueue.add('process-document', {
    documentId: doc.id,
    knowledgeBaseId: kbId,
    tenantId: this.tenantId,
    storagePath,
    mimeType: file.mimetype,
    chunkSize: kb.chunkSize,
    chunkOverlap: kb.chunkOverlap,
  });
  
  return doc;
}

// BullMQ processor (separate worker)
async processDocument(job) {
  const { documentId, ...params } = job.data;
  
  // Call AI Engine HTTP API
  const response = await this.httpService.post(
    `${AI_ENGINE_URL}/engine/v1/documents/process`,
    params
  );
  
  // Update document status based on response
  await this.prisma.document.update({
    where: { id: documentId },
    data: { status: response.status, charCount: response.charCount, ... }
  });
}
```

### 4.6 Channels (`/api/v1/bots/:botId/channels`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Add channel `{type, config}` |
| GET | `/` | List channels for bot |
| PATCH | `/:chId` | Update channel config |
| DELETE | `/:chId` | Disconnect channel |
| POST | `/facebook/connect` | Facebook OAuth flow (stub) |

**Webhook receivers (`/api/v1/webhooks`):**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/facebook` | FB verification challenge |
| POST | `/facebook` | FB message webhook → route to bot → proxy to AI Engine |
| POST | `/telegram` | Telegram update webhook |
| POST | `/zalo` | Zalo event webhook |

### 4.7 Conversations & Messages (`/api/v1`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/bots/:botId/conversations` | List conversations. Filter: channel, status, dateRange. Paginated. |
| GET | `/conversations/:convId` | Conversation detail |
| GET | `/conversations/:convId/messages` | Messages in conversation (paginated, ASC) |
| DELETE | `/conversations/:convId` | Archive conversation |
| GET | `/bots/:botId/messages/search?q=` | Full-text search across messages (PostgreSQL `tsvector`) |
| POST | `/conversations/:convId/rating` | Rate conversation `{rating: 1-5, feedbackText?}` |
| POST | `/messages/:msgId/feedback` | Per-message `{feedback: "thumbs_up" | "thumbs_down"}` |

### 4.8 Analytics (`/api/v1/analytics`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/overview` | KPIs: totalConversationsToday, totalMessagesToday, creditsUsed, creditsRemaining, activeBots, totalDocuments |
| GET | `/conversations?period=7d&botId=` | Conversations over time `[{date, count, avgMessages, avgResponseTimeMs}]` |
| GET | `/messages?period=30d&botId=` | Message volume over time |
| GET | `/credits?period=30d` | Credit usage over time |
| GET | `/channels?period=30d` | Breakdown by channel |
| GET | `/bots/:botId/top-questions?limit=20` | Most asked questions (group by similarity — basic: group by first 50 chars) |
| GET | `/bots/:botId/satisfaction` | Rating distribution `{1: count, 2: count, ...}` |

**Implementation:** Use raw SQL queries via `prisma.$queryRaw` for aggregation queries. Group by `DATE_TRUNC('day', created_at)`.

### 4.9 Billing (`/api/v1`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/plans` | List active plans with pricing |
| GET | `/subscription` | Current subscription + credit usage |
| POST | `/subscription` | Subscribe/upgrade `{planId, billingCycle, paymentMethod}` |
| PATCH | `/subscription` | Change billing cycle |
| DELETE | `/subscription` | Cancel at period end |
| POST | `/credits/top-up` | Purchase credits `{amount, paymentMethod}` → redirect to payment |
| GET | `/credits/usage` | Current period usage detail |
| GET | `/payments` | Payment history (paginated) |
| POST | `/payments/vnpay/callback` | VNPay IPN (public, verify checksum) |
| POST | `/payments/momo/callback` | MoMo IPN (public, verify signature) |

### 4.10 Public Chat API (`/api/v1/chat`)

This is the API that the **embed widget** and **channel webhooks** call. Auth is by bot API key or widget domain validation, NOT JWT.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:botId/config` | Widget loads bot config (name, avatar, greeting, suggestions, widgetConfig). Auth: domain check via Referer header. |
| POST | `/:botId/messages` | Send message, receive SSE stream. Auth: bot API key header or widget token. |
| GET | `/:botId/conversations/:convId/messages` | Load history for returning user. Auth: end_user_id match. |

**Chat proxy flow (critical):**
```typescript
// chat-proxy.controller.ts
@Post(':botId/messages')
@Sse()
async chat(@Param('botId') botId: string, @Body() body: ChatDto, @Res() res) {
  // 1. Validate bot exists & active
  const bot = await this.botsService.findActive(botId);
  
  // 2. Check tenant quota
  await this.creditsService.checkQuota(bot.tenantId);
  
  // 3. Get or create conversation
  const conv = await this.conversationsService.getOrCreate(botId, body.conversationId, body.endUserId);
  
  // 4. Save user message
  const userMsg = await this.messagesService.create({
    conversationId: conv.id, botId, tenantId: bot.tenantId,
    role: 'user', content: body.message,
  });
  
  // 5. Load conversation history (last N turns based on bot.memoryTurns)
  const history = await this.messagesService.getRecent(conv.id, bot.memoryTurns);
  
  // 6. Get attached KB IDs
  const kbIds = await this.botsService.getKnowledgeBaseIds(botId);
  
  // 7. Proxy to AI Engine (SSE)
  const engineStream = await this.httpService.post(
    `${AI_ENGINE_URL}/engine/v1/chat/completions`,
    {
      bot_id: botId, tenant_id: bot.tenantId,
      message: body.message,
      system_prompt: bot.systemPrompt,
      knowledge_base_ids: kbIds,
      top_k: bot.topK,
      memory_turns: bot.memoryTurns,
      conversation_history: history,
      stream: true,
    },
    { responseType: 'stream' }
  );
  
  // 8. Forward SSE to client, buffer assistant response
  let fullContent = '';
  let metadata = {};
  
  engineStream.on('data', (chunk) => {
    // Parse SSE events, forward to client
    res.write(chunk);
    // Buffer content for DB save
    // ... parse delta events, accumulate fullContent
  });
  
  engineStream.on('end', async () => {
    // 9. Save assistant message
    await this.messagesService.create({
      conversationId: conv.id, botId, tenantId: bot.tenantId,
      role: 'assistant', content: fullContent,
      ...metadata, // tokens, searchQuery, retrievalContext
    });
    
    // 10. Increment credit usage
    await this.creditsService.increment(bot.tenantId, 1);
    
    // 11. Update conversation stats
    await this.conversationsService.updateStats(conv.id);
    
    res.end();
  });
}
```

---

## 5. Middleware & Guards

### QuotaGuard
Applied to routes that consume resources (create bot, upload document, send chat).

```typescript
@Injectable()
export class QuotaGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId;
    
    const sub = await this.prisma.subscription.findFirst({
      where: { tenantId, status: { in: ['active', 'trialing'] } },
      include: { plan: true },
    });
    
    if (!sub) throw new ForbiddenException('No active subscription');
    
    // Check specific quota based on route
    const routeType = this.reflector.get<string>('quotaType', context.getHandler());
    
    switch (routeType) {
      case 'bot_create':
        const botCount = await this.prisma.bot.count({ where: { tenantId, deletedAt: null } });
        if (sub.plan.maxBots !== -1 && botCount >= sub.plan.maxBots)
          throw new PaymentRequiredException('Bot limit reached');
        break;
      case 'chat':
        const usage = await this.creditsService.getCurrentUsage(tenantId);
        if (usage.creditsUsed >= usage.creditsAllocated + usage.topUpCredits)
          throw new PaymentRequiredException('Credit limit reached');
        break;
      // ... other quota types
    }
    return true;
  }
}
```

### TenantGuard
Extracts `tenantId` from JWT, attaches to request. Ensures user is member of tenant.

---

## 6. Database Seed

```typescript
// prisma/seed.ts
async function main() {
  // Create plans
  await prisma.plan.createMany({
    data: [
      {
        name: 'Free', slug: 'free',
        maxBots: 1, maxCreditsPerMonth: 100,
        maxKnowledgeCharsPerBot: 250000, maxTeamMembers: 1,
        features: { analytics: false, saveConversations: false, customCss: false,
                    removeBranding: false, facebookIntegration: false, apiAccess: false },
        priceMonthly: 0, priceYearly: 0, priceWeekly: 0, sortOrder: 0,
      },
      {
        name: 'Starter', slug: 'starter',
        maxBots: 5, maxCreditsPerMonth: 3000,
        maxKnowledgeCharsPerBot: 25000000, maxTeamMembers: 1,
        features: { analytics: true, saveConversations: true, voiceInput: true,
                    customCss: false, removeBranding: false, facebookIntegration: false,
                    apiAccess: false, customDomains: 1 },
        priceMonthly: 199000, priceYearly: 1990000, priceWeekly: 59000, sortOrder: 1,
      },
      {
        name: 'Advanced', slug: 'advanced',
        maxBots: 10, maxCreditsPerMonth: 12500,
        maxKnowledgeCharsPerBot: 50000000, maxTeamMembers: 3,
        features: { analytics: true, saveConversations: true, voiceInput: true,
                    customCss: true, removeBranding: true, facebookIntegration: true,
                    humanHandover: true, leadGeneration: true, apiAccess: false,
                    customDomains: 5 },
        priceMonthly: 699000, priceYearly: 6990000, priceWeekly: 199000, sortOrder: 2,
      },
      {
        name: 'Pro', slug: 'pro',
        maxBots: 50, maxCreditsPerMonth: 50000,
        maxKnowledgeCharsPerBot: 200000000, maxTeamMembers: 10,
        features: { analytics: true, saveConversations: true, voiceInput: true,
                    customCss: true, removeBranding: true, facebookIntegration: true,
                    humanHandover: true, leadGeneration: true, apiAccess: true,
                    customDomains: 50, slaGuarantee: true, advancedModels: true },
        priceMonthly: 2099000, priceYearly: 20990000, priceWeekly: 599000, sortOrder: 3,
      },
    ],
  });
}
```

---

## 7. Environment Variables

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/genai_platform

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_ACCESS_TTL=900        # 15 minutes
JWT_REFRESH_TTL=604800    # 7 days

# S3 / MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=genai-platform
S3_REGION=us-east-1

# AI Engine (Phase 2 service)
AI_ENGINE_URL=http://localhost:8000

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# VNPay
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://platform.vn/payment/callback

# App
APP_URL=https://platform.vn
PORT=3000
NODE_ENV=development
```

---

## 8. Docker Compose

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: genai_platform
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports: ["9000:9000", "9001:9001"]
    volumes: [minio_data:/data]

  api:
    build: .
    ports: ["3000:3000"]
    depends_on: [postgres, redis, minio]
    env_file: .env
    command: npm run start:dev

volumes:
  postgres_data:
  minio_data:
```

---

## 9. Implementation Order (Step by Step)

1. **Project init**: `nest new genai-platform-api`, install dependencies, setup Prisma ✓ DONE
2. **Docker compose**: Postgres + Redis + MinIO ✓ DONE
3. **Prisma schema**: Create all models, run migration, seed plans ✓ DONE
4. **Auth module**: Register, login, JWT, refresh token, guards ✓ DONE
5. **Tenants module**: CRUD, members, TenantGuard ✓ DONE
6. **Bots module**: CRUD, personality, widget, API key, embed code ✓ DONE
7. **Knowledge bases module**: CRUD, document CRUD (upload to S3, create record, queue stub) ✓ DONE
8. **Conversations module**: List, messages, search, feedback ✓ DONE
9. **Analytics module**: Overview, time-series aggregation queries ✓ DONE
10. **Billing module**: Plans, subscription, credit usage, payment stubs ✓ DONE
11. **Chat proxy module**: Public chat API, SSE proxy to AI Engine (mock initially) ✓ DONE
12. **Channels module**: CRUD, webhook receivers (stub handlers) ✓ DONE
13. **Quota guard**: Wire up to all resource-consuming routes ✓ DONE
14. **E2E tests**: Auth flow, bot CRUD, document upload, chat flow ✓ DONE
15. **Swagger docs**: Ensure all DTOs have decorators ✓ DONE

**Total estimated routes: ~65 endpoints. COMPLETED.**

---

## Phase 1 Completion Status

**Status:** COMPLETE — All 10 phases implemented, tested, and approved.

**Implementation Timeline:**
- Phase 1 (Project init): Complete
- Phase 2 (Prisma schema): Complete
- Phase 3 (Auth module): Complete
- Phase 4 (Users & Tenants): Complete
- Phase 5 (Bots module): Complete
- Phase 6 (Knowledge Bases): Complete
- Phase 7 (Conversations & Analytics): Complete
- Phase 8 (Billing, Channels, Chat Proxy): Complete
- Phase 9 (App module wiring + bootstrap): Complete
- Phase 10 (Code Review & Fixes): APPROVED WITH CONDITIONS

**Deliverables:**
- NestJS v10 backend with TypeScript strict mode
- 13 Prisma models with full relationships
- 11 feature modules (auth, users, tenants, bots, knowledge-bases, conversations, analytics, billing, channels, chat-proxy, storage)
- 65+ REST API endpoints
- JWT auth with refresh token mechanism
- Multi-tenant isolation via TenantGuard
- BullMQ job queue for AI Engine integration
- Docker Compose stack (Postgres 16, Redis 7, MinIO, API)
- Swagger/OpenAPI documentation
- E2E tests and code review approval

**Code Review Status:** APPROVED WITH CONDITIONS
- 0 CRITICAL issues
- 5 HIGH issues FIXED (tenant isolation, password strength, document quota, XSS, token cleanup)
- 1 MEDIUM issue FIXED (timing-safe comparison)
- All remaining issues are LOW priority / nice-to-haves

**Build Status:** 0 non-Prisma TypeScript errors

**Next Phase:** Phase 2 (AI Engine) can begin. Dependencies on Phase 1 satisfied.
