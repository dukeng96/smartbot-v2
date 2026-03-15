# Comprehensive Testing Plan — GenAI Platform API

> **Total Routes:** 65+ | **Modules:** 13 | **Auth:** JWT Bearer + Internal API Key
> **Base URL:** `http://localhost:3000`

---

## 1. Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Docker Desktop | 4.x+ | Run Postgres, Redis, MinIO |
| Node.js | 20 LTS | NestJS runtime |
| npm | 10+ | Package management |
| curl / Postman / Insomnia | Latest | API testing |

---

## 2. Local Deployment Steps

### Step 1: Clone & Install

```bash
cd genai-platform-api
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work for local dev)
```

Default `.env` values:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/genai_platform
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-min-32-chars-change-in-production
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=604800
MINIO_SERVICE_URL=https://voice-storage.vnpt.vn
MINIO_ACCESS_KEY=texttospeech
MINIO_SECRET_KEY=Text2speechVnptAI@2024
MINIO_FOLDER_NAME=smartbot-v2
AI_ENGINE_URL=http://localhost:8000
INTERNAL_API_KEY=internal-secret-key-change-in-production
PORT=3000
```

### Step 3: Start Docker Services

```bash
docker-compose up -d
```

Verify services running:
```bash
docker ps
# Should see: postgres:16-alpine (5432), redis:7-alpine (6379), minio (9000/9001)
```

### Step 4: Create MinIO Bucket

*Note: If using VNPT's internal MinIO Server (`https://voice-storage.vnpt.vn`), ensure the bucket `smartbot-v2` is already created and credentials are valid.*

### Step 5: Generate Prisma Client & Migrate

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### Step 6: Seed Database

```bash
npx prisma db seed
# Seeds 4 plans: Free, Starter, Advanced, Pro (VND pricing)
```

### Step 7: Start API Server

```bash
npm run start:dev
```

### Step 8: Verify

```bash
curl http://localhost:3000/api
# Should return: { "message": "GenAI Platform API is running" }
```

Swagger UI: `http://localhost:3000/api/docs`

---

## 3. Testing Variables

Throughout testing, save these values after they're returned:

```
ACCESS_TOKEN=<from login/register response>
REFRESH_TOKEN=<from login/register response>
TENANT_ID=<from register response>
USER_ID=<from register response>
BOT_ID=<from bot create response>
KB_ID=<from knowledge base create response>
DOC_ID=<from document create response>
CONV_ID=<from conversation response>
CHANNEL_ID=<from channel create response>
```

Common headers for authenticated requests:
```
Authorization: Bearer ${ACCESS_TOKEN}
Content-Type: application/json
```

---

## 4. Automated Unit Tests (Jest)

### 4.0 How to Run

```bash
# Run all unit tests
npx jest

# Run specific test file
npx jest --testPathPattern auth.service.spec

# Run with coverage
npx jest --coverage

# Run in watch mode
npx jest --watch
```

### 4.1 Test Infrastructure

**Shared Helper:** `src/common/testing/prisma-mock.helper.ts`
- Factory `createPrismaMock()` — creates `jest.fn()` stubs for all 14 Prisma models
- Used by all 12 service test files for consistent mocking

### 4.2 Unit Test Inventory

| # | Test File | Tests | Module |
|---|-----------|-------|--------|
| 1 | `auth.service.spec.ts` | 14 | Auth |
| 2 | `users.service.spec.ts` | 5 | Users |
| 3 | `tenants.service.spec.ts` | 18 | Tenants |
| 4 | `bots.service.spec.ts` | 21 | Bots |
| 5 | `knowledge-bases.service.spec.ts` | 9 | Knowledge Bases |
| 6 | `documents.service.spec.ts` | 14 | Documents |
| 7 | `billing.service.spec.ts` | 13 | Billing |
| 8 | `credits.service.spec.ts` | 8 | Credits |
| 9 | `conversations.service.spec.ts` | 15 | Conversations |
| 10 | `messages.service.spec.ts` | 4 | Messages |
| 11 | `chat-proxy.service.spec.ts` | 6 | Chat Proxy |
| 12 | `quota.guard.spec.ts` | 13 | Quota Guard |
| — | **Total** | **140** | **12 suites** |

### 4.3 Test Details by Module

#### Auth Service (14 tests)
| # | Test | Validates |
|---|------|-----------|
| 1 | Register: creates user, tenant, subscription in transaction | Happy path, $transaction mock |
| 2 | Register: throws ConflictException on duplicate email | Email uniqueness |
| 3 | Register: lowercases email | Input normalization |
| 4 | Login: returns tokens for valid credentials | bcrypt compare, JWT payload |
| 5 | Login: throws for invalid email | UnauthorizedException |
| 6 | Login: throws for wrong password | UnauthorizedException |
| 7 | Login: throws for inactive account | `isActive: false` |
| 8 | Login: throws for no membership | No tenant_member entry |
| 9 | Logout: deletes refresh token | Token revocation |
| 10 | Refresh: returns new tokens for valid refresh token | Token rotation |
| 11 | Refresh: throws for expired token | TTL check |
| 12 | Refresh: throws for non-existent token | UnauthorizedException |
| 13 | ForgotPassword: returns message even if email not found | No information leak |
| 14 | ForgotPassword: returns message when email found | Security message |

#### Users Service (5 tests)
| # | Test | Validates |
|---|------|-----------|
| 1 | GetProfile: returns user data | findUnique, select fields |
| 2 | GetProfile: throws NotFoundException | Missing user |
| 3 | UpdateProfile: updates all fields | fullName, phone, avatarUrl |
| 4 | UpdateProfile: partial update | Only changed fields |
| 5 | UpdateProfile: no-op on empty update | Stability |

#### Tenants Service (18 tests)
| # | Test | Validates |
|---|------|-----------|
| 1 | GetTenant: returns tenant with plan | Include plan relation |
| 2 | GetTenant: throws NotFoundException | Invalid tenantId |
| 3 | UpdateTenant: owner can update | Role check = owner |
| 4 | UpdateTenant: admin can update | Role check = admin |
| 5 | UpdateTenant: member gets ForbiddenException | Role restriction |
| 6 | ListMembers: returns members with user info | Include user relation |
| 7 | InviteMember: creates new user if not exists | Upsert pattern |
| 8 | InviteMember: reuses existing user | No duplicate user |
| 9 | InviteMember: throws ConflictException on duplicate | Already a member |
| 10 | InviteMember: member role gets ForbiddenException | Only owner/admin can invite |
| 11 | UpdateMemberRole: owner can change roles | Owner privilege |
| 12 | UpdateMemberRole: non-owner gets ForbiddenException | Role restriction |
| 13 | UpdateMemberRole: can't change owner's role | Owner protection |
| 14 | UpdateMemberRole: throws NotFoundException | Invalid userId |
| 15 | RemoveMember: success | Delete tenant_member |
| 16 | RemoveMember: can't remove owner | Owner protection |
| 17 | RemoveMember: member gets ForbiddenException | Only owner/admin can remove |
| 18 | RemoveMember: throws NotFoundException | Invalid userId |

#### Bots Service (21 tests)
| # | Test | Validates |
|---|------|-----------|
| 1 | Create: creates bot with defaults | Default status, topK, memoryTurns |
| 2 | FindAll: returns paginated results | PaginatedResult format |
| 3 | FindAll: filters by status | Query param filtering |
| 4 | FindOne: returns bot with KBs | Include relations, soft-delete filter |
| 5 | FindOne: throws NotFoundException | Invalid botId |
| 6 | FindActive: returns active bot | `status: 'active'` filter |
| 7 | FindActive: throws for inactive/missing | NotFoundException |
| 8 | Update: updates bot fields | Partial update |
| 9 | Update: throws NotFoundException | Invalid botId |
| 10 | SoftDelete: sets deletedAt | Soft delete pattern |
| 11 | Duplicate: creates copy with "(copy)" name | Name suffix |
| 12 | GetPersonality: returns personality fields | systemPrompt, greetingMessage, etc. |
| 13 | UpdatePersonality: updates personality fields | Partial update |
| 14 | GenerateApiKey: returns key + hashed storage | Crypto randomBytes |
| 15 | RevokeApiKey: nullifies apiKeyHash | Key revocation |
| 16 | AttachKnowledgeBase: creates link | BotKnowledgeBase join |
| 17 | AttachKnowledgeBase: throws ConflictException on duplicate | Unique constraint |
| 18 | AttachKnowledgeBase: throws NotFoundException for missing KB | KB validation |
| 19 | DetachKnowledgeBase: removes link | Delete join record |
| 20 | GetEmbedCode: returns iframe/bubble/directLink | HTML generation |
| 21 | GetKnowledgeBaseIds: returns KB IDs | Array of strings |

#### Knowledge Bases Service (9 tests)
| # | Test | Validates |
|---|------|-----------|
| 1 | Create: with defaults (chunkSize=500, chunkOverlap=50) | Default settings |
| 2 | Create: with custom chunk settings | Custom chunkSize/overlap |
| 3 | FindAll: paginated results | PaginatedResult format |
| 4 | FindOne: returns KB with doc count | Include _count |
| 5 | FindOne: throws NotFoundException | Invalid kbId |
| 6 | Update: updates fields | Partial update |
| 7 | Update: throws NotFoundException | Invalid kbId |
| 8 | SoftDelete: sets deletedAt | Soft delete pattern |
| 9 | SoftDelete: throws NotFoundException | Invalid kbId |

#### Documents Service (14 tests)
| # | Test | Validates |
|---|------|-----------|
| 1 | UploadFile: creates doc + enqueues BullMQ job | Storage + queue |
| 2 | UploadFile: throws NotFoundException if KB missing | KB validation |
| 3 | CreateFromUrl: creates doc from URL + enqueues | sourceType: 'url_crawl' |
| 4 | CreateFromText: creates doc from text + enqueues | sourceType: 'text_input', charCount |
| 5 | CreateFromText: defaults name to "Text Input" | Default name |
| 6 | FindAll: paginated results | PaginatedResult format |
| 7 | FindOne: returns document | All fields |
| 8 | FindOne: throws NotFoundException | Invalid docId |
| 9 | SoftDelete: soft-deletes + updates KB totals | Cascade update |
| 10 | Reprocess: resets status + re-enqueues | Status reset to pending |
| 11 | ReprocessAll: reprocesses all docs in KB | Batch enqueue |
| 12 | UpdateStatus: updates from AI Engine callback | status, charCount, chunkCount |
| 13 | UpdateStatus: sets processingStartedAt on "processing" | Timestamp tracking |
| 14 | UpdateStatus: throws NotFoundException | Invalid docId |

#### Billing Service (13 tests)
| # | Test | Validates |
|---|------|-----------|
| 1 | ListPlans: returns active plans sorted | isActive filter, sortOrder |
| 2 | GetCurrentSubscription: returns sub + credit usage | Composed response |
| 3 | Subscribe: throws NotFoundException for bad plan | Plan validation |
| 4 | Subscribe: creates new subscription | No existing sub |
| 5 | Subscribe: upgrades existing subscription | Existing sub update |
| 6 | UpdateSubscription: throws NotFoundException | No active sub |
| 7 | UpdateSubscription: updates billing cycle | monthly→yearly |
| 8 | CancelSubscription: throws NotFoundException | No active sub |
| 9 | CancelSubscription: sets cancelAtPeriodEnd | Soft cancel |
| 10 | TopUpCredits: adds credits + payment record | Credits + history |
| 11 | GetPaymentHistory: paginated results | PaginatedResult format |
| 12 | HandleVnpayCallback: returns success response | Stub response |
| 13 | HandleMomoCallback: returns success response | Stub response |

#### Credits Service (8 tests)
| # | Test | Validates |
|---|------|-----------|
| 1 | GetCurrentUsage: returns existing record | findFirst match |
| 2 | GetCurrentUsage: auto-creates from subscription | No existing usage |
| 3 | GetCurrentUsage: defaults to 100 credits | No subscription |
| 4 | CheckQuota: passes when within quota | creditsUsed < allocated |
| 5 | CheckQuota: throws ForbiddenException when exhausted | creditsUsed >= allocated |
| 6 | CheckQuota: allows with topUp credits | topUp buffer |
| 7 | Increment: increments creditsUsed | Atomic update |
| 8 | AddTopUp: increments topUpCredits | Atomic update |

#### Conversations Service (15 tests)
| # | Test | Validates |
|---|------|-----------|
| 1 | FindAllByBot: paginated conversations | PaginatedResult format |
| 2 | FindAllByBot: filters by channel and status | Query filtering |
| 3 | FindOne: returns conversation with bot | Include bot relation |
| 4 | FindOne: throws NotFoundException | Invalid convId |
| 5 | GetMessages: paginated messages | PaginatedResult format |
| 6 | GetMessages: throws NotFoundException | Invalid convId |
| 7 | Archive: sets status to archived | Status update |
| 8 | Rate: saves rating and feedback | Rating persistence |
| 9 | MessageFeedback: saves thumbs_up/down | Feedback update |
| 10 | MessageFeedback: throws NotFoundException | Invalid msgId |
| 11 | SearchMessages: uses ILIKE (contains + insensitive) | Case-insensitive search |
| 12 | GetOrCreate: returns existing conversation | findFirst match |
| 13 | GetOrCreate: creates new when no ID | Create with defaults |
| 14 | GetOrCreate: creates new when ID not found | Fallback create |
| 15 | UpdateStats: updates messageCount + lastMessageAt | Aggregate count |

#### Messages Service (4 tests)
| # | Test | Validates |
|---|------|-----------|
| 1 | Create: creates with all fields | Full message object |
| 2 | Create: creates with optional fields | inputTokens, outputTokens, modelUsed |
| 3 | GetRecent: returns chronological order | Reverse sort |
| 4 | GetRecent: respects limit | take: limit * 2 |

#### Chat Proxy Service (6 tests)
| # | Test | Validates |
|---|------|-----------|
| 1 | GetBotConfig: returns public bot config | Public-facing fields only |
| 2 | GetConversationHistory: returns recent messages | Message retrieval |
| 3 | ProcessChat: yields conversation, delta, done events | SSE event sequence |
| 4 | ProcessChat: saves user and assistant messages | Message persistence |
| 5 | ProcessChat: checks quota and increments credits | Billing integration |
| 6 | ProcessChat: updates conversation stats | Stats update |

#### Quota Guard (13 tests)
| # | Test | Validates |
|---|------|-----------|
| 1 | Allows if no quota type set | No @Quota decorator |
| 2 | Allows if no tenantId in request | Public endpoints |
| 3 | Throws ForbiddenException if no subscription | No active sub |
| 4 | bot_create: allows if under limit | count < maxBots |
| 5 | bot_create: throws if limit reached | count >= maxBots |
| 6 | bot_create: allows unlimited when maxBots=-1 | Unlimited plan |
| 7 | chat: allows if credits remaining | creditsUsed < allocated |
| 8 | chat: throws if credits exhausted | creditsUsed >= allocated |
| 9 | chat: allows if no usage record | First-time user |
| 10 | document_upload: allows if under char limit | charCount < max |
| 11 | document_upload: throws if char limit reached | charCount >= max |
| 12 | document_upload: allows unlimited when max=-1 | Unlimited plan |
| 13 | document_upload: handles null charCount sum | No documents yet |

### 4.4 Known Issues

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| `documents.service.spec.ts` fails with `SyntaxError: Unexpected token 'export'` | `uuid` v13 ships ESM-only; Jest/ts-jest can't parse | Add `transformIgnorePatterns: ['node_modules/(?!uuid)']` to Jest config in `package.json`, or mock uuid module |

---

## 5. API Test Routes by Module (Manual / curl)

---

### 5.1 Auth Module (`/api/v1/auth`)

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | POST | `/api/v1/auth/register` | Public | Register new user |
| 2 | POST | `/api/v1/auth/login` | Public | Login |
| 3 | POST | `/api/v1/auth/logout` | Bearer | Revoke refresh token |
| 4 | POST | `/api/v1/auth/refresh` | Public | Refresh access token |
| 5 | POST | `/api/v1/auth/forgot-password` | Public | Request password reset |
| 6 | POST | `/api/v1/auth/reset-password` | Public | Reset with token (stub) |
| 7 | POST | `/api/v1/auth/verify-email` | Public | Verify email (stub) |
| 8 | POST | `/api/v1/auth/oauth/google` | Public | Google OAuth (stub) |

#### Test Cases:

**TC-AUTH-01: Register (Happy Path)**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "fullName": "Test User"
  }'
```
Expected: `201` — Returns `{ user, tenant, accessToken, refreshToken }`

**TC-AUTH-02: Register (Weak Password)**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "password": "weak"
  }'
```
Expected: `400` — Validation error (min 8 chars, uppercase, lowercase, digit, special char)

**TC-AUTH-03: Register (Duplicate Email)**
```bash
# Same email as TC-AUTH-01
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!!"
  }'
```
Expected: `409` — "Email already registered"

**TC-AUTH-04: Login (Happy Path)**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```
Expected: `201` — Returns `{ user, accessToken, refreshToken }`

**TC-AUTH-05: Login (Wrong Password)**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "WrongPass123!"
  }'
```
Expected: `401` — "Invalid email or password"

**TC-AUTH-06: Refresh Token**
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "${REFRESH_TOKEN}" }'
```
Expected: `201` — Returns new `{ accessToken, refreshToken }`

**TC-AUTH-07: Logout**
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "${REFRESH_TOKEN}" }'
```
Expected: `201` — `{ message: "Logged out successfully" }`

**TC-AUTH-08: Forgot Password**
```bash
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{ "email": "test@example.com" }'
```
Expected: `201` — "If the email exists, a reset link has been sent"

**TC-AUTH-09: Reset Password (Stub)**
```bash
curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{ "token": "fake-token", "newPassword": "NewPass123!" }'
```
Expected: `400` — "Password reset not fully implemented yet"

**TC-AUTH-10: Verify Email (Stub)**
```bash
curl -X POST http://localhost:3000/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{ "token": "fake-token" }'
```
Expected: `400` — "Email verification not fully implemented yet"

**TC-AUTH-11: Google OAuth (Stub)**
```bash
curl -X POST http://localhost:3000/api/v1/auth/oauth/google \
  -H "Content-Type: application/json" \
  -d '{ "idToken": "fake-google-token" }'
```
Expected: `400` — "Google OAuth not fully implemented yet"

---

### 5.2 Users Module (`/api/v1/users`)

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | GET | `/api/v1/users/me` | Bearer | Get profile |
| 2 | PATCH | `/api/v1/users/me` | Bearer | Update profile |

#### Test Cases:

**TC-USER-01: Get Profile**
```bash
curl http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Returns user object (id, email, fullName, avatarUrl, phone, etc.)

**TC-USER-02: Update Profile**
```bash
curl -X PATCH http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Updated Name",
    "phone": "0912345678"
  }'
```
Expected: `200` — Updated user object

**TC-USER-03: Unauthenticated Access**
```bash
curl http://localhost:3000/api/v1/users/me
```
Expected: `401` — Unauthorized

---

### 5.3 Tenants Module (`/api/v1/tenants`)

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | GET | `/api/v1/tenants/:id` | Bearer | Get tenant details |
| 2 | PATCH | `/api/v1/tenants/:id` | Bearer | Update tenant (admin+) |
| 3 | GET | `/api/v1/tenants/:id/members` | Bearer | List members |
| 4 | POST | `/api/v1/tenants/:id/members` | Bearer | Invite member |
| 5 | PATCH | `/api/v1/tenants/:id/members/:userId` | Bearer | Update member role |
| 6 | DELETE | `/api/v1/tenants/:id/members/:userId` | Bearer | Remove member |

#### Test Cases:

**TC-TENANT-01: Get Tenant**
```bash
curl http://localhost:3000/api/v1/tenants/${TENANT_ID} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Returns tenant with plan info

**TC-TENANT-02: Update Tenant**
```bash
curl -X PATCH http://localhost:3000/api/v1/tenants/${TENANT_ID} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "name": "My Updated Workspace" }'
```
Expected: `200` — Updated tenant

**TC-TENANT-03: List Members**
```bash
curl http://localhost:3000/api/v1/tenants/${TENANT_ID}/members \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Array of members (at least 1: the owner)

**TC-TENANT-04: Invite Member**
```bash
curl -X POST http://localhost:3000/api/v1/tenants/${TENANT_ID}/members \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "email": "member@example.com", "role": "member" }'
```
Expected: `201` — New member invitation

**TC-TENANT-05: Update Member Role (Owner Only)**
```bash
curl -X PATCH http://localhost:3000/api/v1/tenants/${TENANT_ID}/members/${MEMBER_USER_ID} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "role": "admin" }'
```
Expected: `200` — Updated member role

**TC-TENANT-06: Remove Member**
```bash
curl -X DELETE http://localhost:3000/api/v1/tenants/${TENANT_ID}/members/${MEMBER_USER_ID} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Member removed

---

### 5.4 Bots Module (`/api/v1/bots`)

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | POST | `/api/v1/bots` | Bearer + QuotaGuard | Create bot |
| 2 | GET | `/api/v1/bots` | Bearer | List bots (paginated) |
| 3 | GET | `/api/v1/bots/:id` | Bearer | Get bot detail |
| 4 | PATCH | `/api/v1/bots/:id` | Bearer | Update bot |
| 5 | DELETE | `/api/v1/bots/:id` | Bearer | Soft delete bot |
| 6 | POST | `/api/v1/bots/:id/duplicate` | Bearer + QuotaGuard | Duplicate bot |
| 7 | GET | `/api/v1/bots/:id/personality` | Bearer | Get personality config |
| 8 | PATCH | `/api/v1/bots/:id/personality` | Bearer | Update personality |
| 9 | PATCH | `/api/v1/bots/:id/widget` | Bearer | Update widget config |
| 10 | GET | `/api/v1/bots/:id/widget/preview` | Bearer | Preview widget HTML |
| 11 | POST | `/api/v1/bots/:id/api-key` | Bearer | Generate API key |
| 12 | DELETE | `/api/v1/bots/:id/api-key` | Bearer | Revoke API key |
| 13 | GET | `/api/v1/bots/:id/embed-code` | Bearer | Get embed snippets |
| 14 | POST | `/api/v1/bots/:id/knowledge-bases` | Bearer | Attach KB |
| 15 | DELETE | `/api/v1/bots/:id/knowledge-bases/:kbId` | Bearer | Detach KB |
| 16 | GET | `/api/v1/bots/:id/knowledge-bases` | Bearer | List attached KBs |

#### Test Cases:

**TC-BOT-01: Create Bot**
```bash
curl -X POST http://localhost:3000/api/v1/bots \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Bot",
    "description": "A helpful customer service assistant"
  }'
```
Expected: `201` — Returns bot object with `status: "draft"`

**TC-BOT-02: Create Bot (Quota Exceeded - Free Plan = 1 bot)**
```bash
# Create second bot on Free plan
curl -X POST http://localhost:3000/api/v1/bots \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Second Bot" }'
```
Expected: `402` — "Bot limit reached. Please upgrade your plan."

**TC-BOT-03: List Bots**
```bash
curl "http://localhost:3000/api/v1/bots?page=1&limit=10" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — `{ data: [...], meta: { total, page, limit, totalPages } }`

**TC-BOT-04: List Bots with Status Filter**
```bash
curl "http://localhost:3000/api/v1/bots?status=draft" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Only draft bots

**TC-BOT-05: Get Bot Detail**
```bash
curl http://localhost:3000/api/v1/bots/${BOT_ID} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Bot with knowledgeBases, _count

**TC-BOT-06: Update Bot**
```bash
curl -X PATCH http://localhost:3000/api/v1/bots/${BOT_ID} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Bot Name",
    "status": "active",
    "topK": 10,
    "memoryTurns": 8
  }'
```
Expected: `200` — Updated bot

**TC-BOT-07: Soft Delete Bot**
```bash
curl -X DELETE http://localhost:3000/api/v1/bots/${BOT_ID} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Bot with `deletedAt` set

**TC-BOT-08: Duplicate Bot**
```bash
curl -X POST http://localhost:3000/api/v1/bots/${BOT_ID}/duplicate \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `201` — New bot with "(copy)" suffix

**TC-BOT-09: Get Personality**
```bash
curl http://localhost:3000/api/v1/bots/${BOT_ID}/personality \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — `{ systemPrompt, greetingMessage, suggestedQuestions, fallbackMessage, personality }`

**TC-BOT-10: Update Personality**
```bash
curl -X PATCH http://localhost:3000/api/v1/bots/${BOT_ID}/personality \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "You are a helpful Vietnamese assistant",
    "greetingMessage": "Xin chao! Toi co the giup gi cho ban?",
    "suggestedQuestions": ["Gioi thieu san pham", "Gia ca", "Lien he"],
    "fallbackMessage": "Xin loi, toi khong hieu cau hoi cua ban.",
    "personality": { "tone": "friendly", "language": "vi" }
  }'
```
Expected: `200` — Updated personality fields

**TC-BOT-11: Update Widget Config**
```bash
curl -X PATCH http://localhost:3000/api/v1/bots/${BOT_ID}/widget \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "theme": "dark",
    "primaryColor": "#2563eb",
    "position": "bottom-right",
    "showPoweredBy": true,
    "headerText": "Chat with us"
  }'
```
Expected: `200` — `{ id, widgetConfig }`

**TC-BOT-12: Preview Widget HTML**
```bash
curl http://localhost:3000/api/v1/bots/${BOT_ID}/widget/preview \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — `{ html: "<!-- Widget Preview ... -->" }` (HTML-escaped bot name)

**TC-BOT-13: Generate API Key**
```bash
curl -X POST http://localhost:3000/api/v1/bots/${BOT_ID}/api-key \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `201` — `{ apiKey: "sk_...", prefix: "sk_xxxx" }` (key shown only once)

**TC-BOT-14: Revoke API Key**
```bash
curl -X DELETE http://localhost:3000/api/v1/bots/${BOT_ID}/api-key \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — `{ message: "API key revoked" }`

**TC-BOT-15: Get Embed Code**
```bash
curl http://localhost:3000/api/v1/bots/${BOT_ID}/embed-code \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — `{ iframe, bubble, directLink }`

**TC-BOT-16: Attach Knowledge Base**
```bash
curl -X POST http://localhost:3000/api/v1/bots/${BOT_ID}/knowledge-bases \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "knowledgeBaseId": "${KB_ID}", "priority": 1 }'
```
Expected: `201` — BotKnowledgeBase link with KB details

**TC-BOT-17: Attach KB (Duplicate)**
```bash
# Same request as TC-BOT-16
```
Expected: `409` — "Knowledge base already attached"

**TC-BOT-18: List Attached KBs**
```bash
curl http://localhost:3000/api/v1/bots/${BOT_ID}/knowledge-bases \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Array of BotKnowledgeBase with KB info

**TC-BOT-19: Detach Knowledge Base**
```bash
curl -X DELETE http://localhost:3000/api/v1/bots/${BOT_ID}/knowledge-bases/${KB_ID} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — `{ message: "Knowledge base detached" }`

**TC-BOT-20: Bot Not Found**
```bash
curl http://localhost:3000/api/v1/bots/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `404` — "Bot not found"

---

### 5.5 Knowledge Bases Module (`/api/v1/knowledge-bases`)

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | POST | `/api/v1/knowledge-bases` | Bearer | Create KB |
| 2 | GET | `/api/v1/knowledge-bases` | Bearer | List KBs |
| 3 | GET | `/api/v1/knowledge-bases/:id` | Bearer | Get KB detail |
| 4 | PATCH | `/api/v1/knowledge-bases/:id` | Bearer | Update KB |
| 5 | DELETE | `/api/v1/knowledge-bases/:id` | Bearer | Soft delete KB |
| 6 | POST | `/api/v1/knowledge-bases/:id/documents/upload` | Bearer | Upload document file |

#### Test Cases:

**TC-KB-01: Create KB**
```bash
curl -X POST http://localhost:3000/api/v1/knowledge-bases \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ 
    "name": "FAQ Database",
    "description": "Company policies",
    "chunkSize": 500,
    "chunkOverlap": 50
  }'
```
Expected: `201` — Created KB object

**TC-KB-02: Upload Document File**
```bash
curl -X POST http://localhost:3000/api/v1/knowledge-bases/${KB_ID}/documents/upload \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -F "file=@/path/to/your/document.pdf"
```
Expected: `201` — Created Document object. Check AI Engine logs to see processing.

---

### 5.6 Internal Module (`/api/v1/internal`)

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | PATCH | `/api/v1/internal/documents/:id/status` | Internal Key | Webhook for AI Engine |

#### Test Cases:

**TC-INTERNAL-01: Correct Internal Key Update**
```bash
curl -X PATCH http://localhost:3000/api/v1/internal/documents/${DOC_ID}/status \
  -H "X-Internal-Key: internal-secret-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "processing",
    "errorMessage": null
  }'
```
Expected: `200` — Document Status Updated

**TC-INTERNAL-02: Expected Rejection on Invalid Key**
```bash
curl -X PATCH http://localhost:3000/api/v1/internal/documents/${DOC_ID}/status \
  -H "X-Internal-Key: wrong-key" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```
Expected: `401/403` — Unauthorized / Forbidden
| 5 | DELETE | `/api/v1/knowledge-bases/:id` | Bearer | Soft delete KB |
| 6 | POST | `/api/v1/knowledge-bases/:id/reprocess-all` | Bearer | Re-process all docs |

#### Test Cases:

**TC-KB-01: Create Knowledge Base**
```bash
curl -X POST http://localhost:3000/api/v1/knowledge-bases \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product FAQ",
    "description": "FAQ about our products"
  }'
```
Expected: `201` — KB object with `status: "active"`

**TC-KB-02: List Knowledge Bases**
```bash
curl "http://localhost:3000/api/v1/knowledge-bases?page=1&limit=10" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Paginated list of KBs

**TC-KB-03: Get KB Detail**
```bash
curl http://localhost:3000/api/v1/knowledge-bases/${KB_ID} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — KB with document count

**TC-KB-04: Update KB**
```bash
curl -X PATCH http://localhost:3000/api/v1/knowledge-bases/${KB_ID} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Updated FAQ", "description": "Updated description" }'
```
Expected: `200` — Updated KB

**TC-KB-05: Soft Delete KB**
```bash
curl -X DELETE http://localhost:3000/api/v1/knowledge-bases/${KB_ID} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — KB with `deletedAt` set

**TC-KB-06: Reprocess All Documents**
```bash
curl -X POST http://localhost:3000/api/v1/knowledge-bases/${KB_ID}/reprocess-all \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `201` — `{ message: "Re-processing X documents", count: X }`

---

### 5.6 Documents Module (`/api/v1/knowledge-bases/:kbId/documents`)

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | POST | `.../:kbId/documents/upload` | Bearer | Upload file |
| 2 | POST | `.../:kbId/documents/url` | Bearer | Create from URL |
| 3 | POST | `.../:kbId/documents/text` | Bearer | Create from text |
| 4 | GET | `.../:kbId/documents` | Bearer | List documents |
| 5 | GET | `.../:kbId/documents/:docId` | Bearer | Get document detail |
| 6 | PATCH | `.../:kbId/documents/:docId` | Bearer | Update document |
| 7 | DELETE | `.../:kbId/documents/:docId` | Bearer | Soft delete document |
| 8 | POST | `.../:kbId/documents/:docId/reprocess` | Bearer | Re-process document |

#### Test Cases:

**TC-DOC-01: Upload File**
```bash
curl -X POST http://localhost:3000/api/v1/knowledge-bases/${KB_ID}/documents/upload \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -F "file=@/path/to/test.pdf"
```
Expected: `201` — Document object with `status: "pending"`, `sourceType: "file"`

**TC-DOC-02: Create from URL**
```bash
curl -X POST http://localhost:3000/api/v1/knowledge-bases/${KB_ID}/documents/url \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://example.com/faq" }'
```
Expected: `201` — Document with `sourceType: "url"`

**TC-DOC-03: Create from Text**
```bash
curl -X POST http://localhost:3000/api/v1/knowledge-bases/${KB_ID}/documents/text \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Company Policy",
    "content": "This is the company policy text content for testing..."
  }'
```
Expected: `201` — Document with `sourceType: "text"`

**TC-DOC-04: List Documents**
```bash
curl "http://localhost:3000/api/v1/knowledge-bases/${KB_ID}/documents?page=1&limit=10" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Paginated list of documents

**TC-DOC-05: Get Document Detail**
```bash
curl http://localhost:3000/api/v1/knowledge-bases/${KB_ID}/documents/${DOC_ID} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Document object

**TC-DOC-06: Update Document**
```bash
curl -X PATCH http://localhost:3000/api/v1/knowledge-bases/${KB_ID}/documents/${DOC_ID} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "enabled": false }'
```
Expected: `200` — Updated document

**TC-DOC-07: Soft Delete Document**
```bash
curl -X DELETE http://localhost:3000/api/v1/knowledge-bases/${KB_ID}/documents/${DOC_ID} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Document with `deletedAt` set

**TC-DOC-08: Reprocess Document**
```bash
curl -X POST http://localhost:3000/api/v1/knowledge-bases/${KB_ID}/documents/${DOC_ID}/reprocess \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `201` — Document with `status: "pending"`

---

### 5.7 Internal Documents Callback (`/api/v1/internal/documents`)

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | PATCH | `/api/v1/internal/documents/:id/status` | X-Internal-Key | AI Engine callback |

#### Test Cases:

**TC-INTERNAL-01: Update Document Status (Success)**
```bash
curl -X PATCH http://localhost:3000/api/v1/internal/documents/${DOC_ID}/status \
  -H "X-Internal-Key: internal-secret-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "charCount": 15000,
    "chunkCount": 25
  }'
```
Expected: `200` — Updated document status

**TC-INTERNAL-02: Update Status (Processing Failed)**
```bash
curl -X PATCH http://localhost:3000/api/v1/internal/documents/${DOC_ID}/status \
  -H "X-Internal-Key: internal-secret-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "failed",
    "errorMessage": "OCR failed: unsupported format"
  }'
```
Expected: `200` — Document with `status: "failed"`, `errorMessage` set

**TC-INTERNAL-03: Invalid Internal Key**
```bash
curl -X PATCH http://localhost:3000/api/v1/internal/documents/${DOC_ID}/status \
  -H "X-Internal-Key: wrong-key" \
  -H "Content-Type: application/json" \
  -d '{ "status": "completed" }'
```
Expected: `401` — "Invalid internal API key"

**TC-INTERNAL-04: Missing Internal Key**
```bash
curl -X PATCH http://localhost:3000/api/v1/internal/documents/${DOC_ID}/status \
  -H "Content-Type: application/json" \
  -d '{ "status": "completed" }'
```
Expected: `401` — "Invalid internal API key"

---

### 5.8 Conversations Module (`/api/v1`)

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | GET | `/api/v1/bots/:botId/conversations` | Bearer | List conversations |
| 2 | GET | `/api/v1/conversations/:convId` | Bearer | Get conversation detail |
| 3 | GET | `/api/v1/conversations/:convId/messages` | Bearer | List messages |
| 4 | DELETE | `/api/v1/conversations/:convId` | Bearer | Archive conversation |
| 5 | GET | `/api/v1/bots/:botId/messages/search` | Bearer | Search messages |
| 6 | POST | `/api/v1/conversations/:convId/rating` | Bearer | Rate conversation |
| 7 | POST | `/api/v1/messages/:msgId/feedback` | Bearer | Message feedback |

#### Test Cases:

**TC-CONV-01: List Conversations for Bot**
```bash
curl "http://localhost:3000/api/v1/bots/${BOT_ID}/conversations?page=1&limit=10" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Paginated list (may be empty initially)

**TC-CONV-02: Get Conversation Detail**
```bash
curl http://localhost:3000/api/v1/conversations/${CONV_ID} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Conversation with messages

**TC-CONV-03: List Messages**
```bash
curl "http://localhost:3000/api/v1/conversations/${CONV_ID}/messages?page=1&limit=20" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Paginated messages

**TC-CONV-04: Archive Conversation**
```bash
curl -X DELETE http://localhost:3000/api/v1/conversations/${CONV_ID} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Conversation with `status: "archived"`

**TC-CONV-05: Search Messages**
```bash
curl "http://localhost:3000/api/v1/bots/${BOT_ID}/messages/search?q=hello&page=1&limit=10" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Matching messages

**TC-CONV-06: Rate Conversation**
```bash
curl -X POST http://localhost:3000/api/v1/conversations/${CONV_ID}/rating \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "rating": 5, "feedback": "Very helpful!" }'
```
Expected: `201` — Updated conversation with rating

**TC-CONV-07: Message Feedback**
```bash
curl -X POST http://localhost:3000/api/v1/messages/${MSG_ID}/feedback \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "feedback": "up" }'
```
Expected: `201` — Updated message with feedback

---

### 5.9 Analytics Module (`/api/v1/analytics`)

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | GET | `/api/v1/analytics/overview` | Bearer | Dashboard KPIs |
| 2 | GET | `/api/v1/analytics/conversations` | Bearer | Conversations over time |
| 3 | GET | `/api/v1/analytics/messages` | Bearer | Message volume |
| 4 | GET | `/api/v1/analytics/credits` | Bearer | Credit usage |
| 5 | GET | `/api/v1/analytics/channels` | Bearer | Channel breakdown |
| 6 | GET | `/api/v1/analytics/bots/:botId/top-questions` | Bearer | Top questions |
| 7 | GET | `/api/v1/analytics/bots/:botId/satisfaction` | Bearer | Satisfaction stats |

#### Test Cases:

**TC-ANALYTICS-01: Dashboard Overview**
```bash
curl http://localhost:3000/api/v1/analytics/overview \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — `{ totalBots, totalConversations, totalMessages, creditsUsed, creditsRemaining }`

**TC-ANALYTICS-02: Conversations Over Time**
```bash
curl "http://localhost:3000/api/v1/analytics/conversations?period=7d" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Array of `{ date, count }` grouped by day

**TC-ANALYTICS-03: Message Volume**
```bash
curl "http://localhost:3000/api/v1/analytics/messages?period=30d&botId=${BOT_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Array of `{ date, count }`

**TC-ANALYTICS-04: Credit Usage**
```bash
curl "http://localhost:3000/api/v1/analytics/credits?period=30d" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Array of `{ date, credits }`

**TC-ANALYTICS-05: Channel Breakdown**
```bash
curl "http://localhost:3000/api/v1/analytics/channels?period=30d" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Array of `{ channel, count }`

**TC-ANALYTICS-06: Top Questions**
```bash
curl "http://localhost:3000/api/v1/analytics/bots/${BOT_ID}/top-questions?limit=10" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Array of top questions with frequency

**TC-ANALYTICS-07: Satisfaction Distribution**
```bash
curl http://localhost:3000/api/v1/analytics/bots/${BOT_ID}/satisfaction \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Rating distribution stats

---

### 5.10 Billing Module (`/api/v1`)

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | GET | `/api/v1/plans` | Public | List plans |
| 2 | GET | `/api/v1/subscription` | Bearer | Current subscription |
| 3 | POST | `/api/v1/subscription` | Bearer | Subscribe/upgrade |
| 4 | PATCH | `/api/v1/subscription` | Bearer | Update billing cycle |
| 5 | DELETE | `/api/v1/subscription` | Bearer | Cancel subscription |
| 6 | POST | `/api/v1/credits/top-up` | Bearer | Purchase credits |
| 7 | GET | `/api/v1/credits/usage` | Bearer | Credit usage |
| 8 | GET | `/api/v1/payments` | Bearer | Payment history |
| 9 | POST | `/api/v1/payments/vnpay/callback` | Public | VNPay IPN |
| 10 | POST | `/api/v1/payments/momo/callback` | Public | MoMo IPN |

#### Test Cases:

**TC-BILLING-01: List Plans (Public)**
```bash
curl http://localhost:3000/api/v1/plans
```
Expected: `200` — 4 plans (Free, Starter, Advanced, Pro) with VND pricing

**TC-BILLING-02: Get Current Subscription**
```bash
curl http://localhost:3000/api/v1/subscription \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Subscription with plan details, credit usage

**TC-BILLING-03: Subscribe/Upgrade to Starter**
```bash
curl -X POST http://localhost:3000/api/v1/subscription \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "planSlug": "starter", "billingCycle": "monthly" }'
```
Expected: `201` — New subscription + payment URL (if applicable)

**TC-BILLING-04: Update Billing Cycle**
```bash
curl -X PATCH http://localhost:3000/api/v1/subscription \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "billingCycle": "yearly" }'
```
Expected: `200` — Updated subscription

**TC-BILLING-05: Cancel Subscription**
```bash
curl -X DELETE http://localhost:3000/api/v1/subscription \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Subscription marked `cancel_at_period_end`

**TC-BILLING-06: Top Up Credits**
```bash
curl -X POST http://localhost:3000/api/v1/credits/top-up \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "amount": 1000 }'
```
Expected: `201` — Credit top-up created

**TC-BILLING-07: Get Credit Usage**
```bash
curl http://localhost:3000/api/v1/credits/usage \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — `{ creditsAllocated, creditsUsed, topUpCredits, periodStart, periodEnd }`

**TC-BILLING-08: Payment History**
```bash
curl "http://localhost:3000/api/v1/payments?page=1&limit=10" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Paginated payment records

**TC-BILLING-09: VNPay Callback (Stub)**
```bash
curl -X POST http://localhost:3000/api/v1/payments/vnpay/callback \
  -H "Content-Type: application/json" \
  -d '{ "vnp_TxnRef": "test123", "vnp_ResponseCode": "00" }'
```
Expected: `201` — Callback acknowledged

**TC-BILLING-10: MoMo Callback (Stub)**
```bash
curl -X POST http://localhost:3000/api/v1/payments/momo/callback \
  -H "Content-Type: application/json" \
  -d '{ "orderId": "test123", "resultCode": 0 }'
```
Expected: `201` — Callback acknowledged

---

### 5.11 Channels Module (`/api/v1/bots/:botId/channels`)

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | POST | `.../:botId/channels` | Bearer | Add channel |
| 2 | GET | `.../:botId/channels` | Bearer | List channels |
| 3 | PATCH | `.../:botId/channels/:chId` | Bearer | Update channel |
| 4 | DELETE | `.../:botId/channels/:chId` | Bearer | Disconnect channel |
| 5 | POST | `.../:botId/channels/facebook/connect` | Bearer | Connect FB (stub) |

#### Test Cases:

**TC-CH-01: Create Channel (Web Widget)**
```bash
curl -X POST http://localhost:3000/api/v1/bots/${BOT_ID}/channels \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "web_widget",
    "name": "Main Website Widget",
    "config": { "allowedDomains": ["example.com"] }
  }'
```
Expected: `201` — Channel object

**TC-CH-02: List Channels**
```bash
curl http://localhost:3000/api/v1/bots/${BOT_ID}/channels \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Array of channels

**TC-CH-03: Update Channel**
```bash
curl -X PATCH http://localhost:3000/api/v1/bots/${BOT_ID}/channels/${CHANNEL_ID} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Updated Widget", "isActive": false }'
```
Expected: `200` — Updated channel

**TC-CH-04: Delete Channel**
```bash
curl -X DELETE http://localhost:3000/api/v1/bots/${BOT_ID}/channels/${CHANNEL_ID} \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```
Expected: `200` — Channel removed

**TC-CH-05: Connect Facebook (Stub)**
```bash
curl -X POST http://localhost:3000/api/v1/bots/${BOT_ID}/channels/facebook/connect \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "pageAccessToken": "fake-token", "pageId": "12345" }'
```
Expected: `201` or `400` — Stub response

---

### 5.12 Webhooks Module (`/api/v1/webhooks`)

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | GET | `/api/v1/webhooks/facebook` | Public | FB verify challenge |
| 2 | POST | `/api/v1/webhooks/facebook` | Public | FB message webhook |
| 3 | POST | `/api/v1/webhooks/telegram` | Public | Telegram webhook |
| 4 | POST | `/api/v1/webhooks/zalo` | Public | Zalo webhook |

#### Test Cases:

**TC-WH-01: Facebook Verification**
```bash
curl "http://localhost:3000/api/v1/webhooks/facebook?hub.mode=subscribe&hub.verify_token=smartbot-fb-verify&hub.challenge=test_challenge"
```
Expected: `200` — Returns `test_challenge`

**TC-WH-02: Facebook Verification (Bad Token)**
```bash
curl "http://localhost:3000/api/v1/webhooks/facebook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=test"
```
Expected: `200` — Returns "Verification failed"

**TC-WH-03: Facebook Webhook**
```bash
curl -X POST http://localhost:3000/api/v1/webhooks/facebook \
  -H "Content-Type: application/json" \
  -d '{ "object": "page", "entry": [{ "messaging": [{ "message": { "text": "Hello" } }] }] }'
```
Expected: `201` — `{ status: "EVENT_RECEIVED" }`

**TC-WH-04: Telegram Webhook**
```bash
curl -X POST http://localhost:3000/api/v1/webhooks/telegram \
  -H "Content-Type: application/json" \
  -d '{ "update_id": 123, "message": { "text": "Hello" } }'
```
Expected: `201` — `{ ok: true }`

**TC-WH-05: Zalo Webhook**
```bash
curl -X POST http://localhost:3000/api/v1/webhooks/zalo \
  -H "Content-Type: application/json" \
  -d '{ "event_name": "user_send_text", "message": { "text": "Hello" } }'
```
Expected: `201` — `{ error: 0, message: "success" }`

---

### 5.13 Chat Proxy Module (`/api/v1/chat`) — Public Widget API

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | GET | `/api/v1/chat/:botId/config` | Public | Widget bot config |
| 2 | POST | `/api/v1/chat/:botId/messages` | Public (optional API key) | Send message (SSE) |
| 3 | GET | `/api/v1/chat/:botId/conversations/:convId/messages` | Public | Conversation history |

#### Test Cases:

**TC-CHAT-01: Get Bot Config (Widget)**
```bash
curl http://localhost:3000/api/v1/chat/${BOT_ID}/config
```
Expected: `200` — `{ name, avatarUrl, greetingMessage, suggestedQuestions, widgetConfig }`

**TC-CHAT-02: Get Bot Config (Inactive Bot)**
```bash
# BOT_ID of a draft bot
curl http://localhost:3000/api/v1/chat/${DRAFT_BOT_ID}/config
```
Expected: `404` — "Bot not found or inactive"

**TC-CHAT-03: Send Message (SSE Stream)**
```bash
curl -N -X POST http://localhost:3000/api/v1/chat/${BOT_ID}/messages \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is your return policy?",
    "conversationId": null,
    "endUserId": "end-user-123",
    "endUserName": "Nguyen Van B"
  }'
```
Expected: SSE stream with events:
```
event: conversation
data: {"conversationId":"..."}

event: token
data: {"content":"..."}

event: done
data: {"messageId":"...","totalTokens":...}
```

> **Note:** Since AI Engine is not running, the stream will return mock/error response. The test validates the SSE headers and stream format.

**TC-CHAT-04: Get Conversation History**
```bash
curl http://localhost:3000/api/v1/chat/${BOT_ID}/conversations/${CONV_ID}/messages \
  -H "X-End-User-Id: end-user-123"
```
Expected: `200` — Array of messages

---

## 6. Cross-Cutting Test Scenarios

### 6.1 Authentication & Authorization

| # | Test | Expected |
|---|------|----------|
| CC-01 | Access protected route without token | `401 Unauthorized` |
| CC-02 | Access protected route with expired token | `401 Unauthorized` |
| CC-03 | Access protected route with malformed token | `401 Unauthorized` |
| CC-04 | Access bot from different tenant | `404 Not found` (tenant isolation) |
| CC-05 | Non-owner tries to update tenant | `403 Forbidden` |

### 6.2 Pagination

| # | Test | Expected |
|---|------|----------|
| CC-06 | `?page=1&limit=5` | Returns max 5 items, correct `totalPages` |
| CC-07 | `?page=999` (beyond data) | Returns empty `data: []` |
| CC-08 | `?sort=name&order=asc` | Sorted alphabetically |
| CC-09 | No pagination params | Defaults: `page=1, limit=20` |

### 6.3 Quota Enforcement

| # | Test | Expected |
|---|------|----------|
| CC-10 | Create bot beyond Free plan limit (1) | `402 Payment Required` |
| CC-11 | Chat when credits exhausted | `402 Payment Required` |
| CC-12 | Upload doc when char limit reached | `402 Payment Required` |

### 6.4 Validation

| # | Test | Expected |
|---|------|----------|
| CC-13 | Invalid UUID in path param | `400 Bad Request` (ParseUUIDPipe) |
| CC-14 | Missing required fields | `400 Bad Request` (class-validator) |
| CC-15 | Invalid email format | `400 Bad Request` |
| CC-16 | Password without uppercase/digit/special | `400 Bad Request` |

### 6.5 Soft Delete

| # | Test | Expected |
|---|------|----------|
| CC-17 | Deleted bot not in list | Filtered by `deletedAt: null` |
| CC-18 | Deleted KB not in list | Filtered by `deletedAt: null` |
| CC-19 | Deleted document not in list | Filtered by `deletedAt: null` |

---

## 7. Recommended Testing Order

Execute tests in this order to build data dependencies:

```
1. Auth         → Register + Login (get ACCESS_TOKEN)
2. Users        → Get/Update profile
3. Tenants      → Get/Update tenant, manage members
4. Bots         → Create bot (get BOT_ID), update, personality, widget
5. Knowledge    → Create KB (get KB_ID), attach to bot
6. Documents    → Upload/create docs (get DOC_ID)
7. Internal     → Test AI Engine callback
8. Chat Proxy   → Test SSE chat (requires active bot)
9. Conversations → List/search after chat creates data
10. Analytics    → View stats after data exists
11. Billing     → Plans, subscription, credits
12. Channels    → Add channels to bot
13. Webhooks    → Test FB/Telegram/Zalo stubs
```

---

## 8. Swagger UI

Access interactive API docs at: **`http://localhost:3000/api/docs`**

All endpoints documented with:
- Request/response schemas
- Required auth (Bearer or X-Internal-Key)
- DTO validation rules
- Query parameter descriptions

---

## 9. Cleanup / Reset

```bash
# Reset database completely
npx prisma migrate reset --force
# Re-seed plans
npx prisma db seed

# Stop Docker services
docker-compose down

# Remove volumes (full reset)
docker-compose down -v
```

---

## 10. Summary

| Module | Routes | Test Cases |
|--------|--------|------------|
| Auth | 8 | 11 |
| Users | 2 | 3 |
| Tenants | 6 | 6 |
| Bots | 16 | 20 |
| Knowledge Bases | 6 | 6 |
| Documents | 8 | 8 |
| Internal Callback | 1 | 4 |
| Conversations | 7 | 7 |
| Analytics | 7 | 7 |
| Billing | 10 | 10 |
| Channels | 5 | 5 |
| Webhooks | 4 | 5 |
| Chat Proxy | 3 | 4 |
| Cross-Cutting | — | 19 |
| **Total** | **83** | **115** |
