# Database Schema

PostgreSQL 16 via Prisma 7. All tables have `tenantId` for multi-tenancy.

## Entity Relationship

```
User ─┬─< TenantMember >─── Tenant ─┬─< Bot ─── Flow
      │                             │     └─< BotKnowledgeBase >─ KnowledgeBase ─< Document
      └─< RefreshToken              │
                                    ├─< Conversation ─< Message
                                    ├─< FlowExecution
                                    ├─< Credential
                                    ├─< CustomTool
                                    ├─< Channel
                                    └─< Subscription, CreditUsage, PaymentHistory
```

## Core Tables

### users
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| email | VARCHAR(255) | Unique |
| passwordHash | VARCHAR(255) | Nullable (OAuth) |
| fullName | VARCHAR(255) | |
| authProvider | VARCHAR(20) | email/google/github |
| status | VARCHAR(20) | active/inactive |

### tenants
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | VARCHAR(255) | |
| slug | VARCHAR(100) | Unique |
| ownerId | UUID | FK → users |
| planId | UUID | FK → plans |
| settings | JSON | |

### bots
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenantId | UUID | FK → tenants |
| name | VARCHAR(255) | |
| status | VARCHAR(20) | draft/active/archived |
| systemPrompt | TEXT | |
| flowId | UUID | FK → flows, Unique |
| widgetConfig | JSON | |

### knowledge_bases
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenantId | UUID | FK → tenants |
| name | VARCHAR(255) | |
| vectorCollection | VARCHAR(100) | Qdrant collection |
| embeddingModel | VARCHAR(100) | vnpt-bge-m3 |
| chunkSize | INT | Default 500 |

### documents
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| knowledgeBaseId | UUID | FK → knowledge_bases |
| tenantId | UUID | FK → tenants |
| sourceType | VARCHAR(20) | file/url/text |
| status | VARCHAR(20) | pending/processing/ready/failed |
| storagePath | VARCHAR | MinIO path |
| charCount | BIGINT | |
| chunkCount | INT | |

## AgentCanvas Tables

### flows
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenantId | UUID | FK → tenants |
| name | VARCHAR(255) | |
| type | VARCHAR(32) | agentflow |
| flowData | JSON | Canvas nodes + edges |
| deployed | BOOLEAN | |
| createdBy | UUID | FK → users |

### flow_executions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| flowId | UUID | FK → flows |
| conversationId | UUID | FK → conversations |
| state | VARCHAR(20) | running/completed/failed/paused |
| executionData | JSON | Node outputs |
| tokensUsed | INT | |

### credentials
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenantId | UUID | FK → tenants |
| name | VARCHAR(128) | Unique per tenant |
| credentialType | VARCHAR(64) | vnpt_llm/openai/etc |
| encryptedData | BYTES | AES-256-GCM |
| iv | BYTES | |
| authTag | BYTES | |

### custom_tools
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenantId | UUID | FK → tenants |
| name | VARCHAR(128) | Unique per tenant |
| description | TEXT | |
| schema | JSON | Input schema |
| implementation | TEXT | RestrictedPython code |

## Billing Tables

### plans
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | VARCHAR(100) | |
| slug | VARCHAR(50) | Unique |
| maxBots | INT | |
| maxCreditsPerMonth | INT | |
| priceMonthly | BIGINT | VND |

### subscriptions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenantId | UUID | FK → tenants |
| planId | UUID | FK → plans |
| status | VARCHAR(20) | active/cancelled/expired |
| currentPeriodStart | TIMESTAMP | |
| currentPeriodEnd | TIMESTAMP | |

### credit_usages
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenantId | UUID | FK → tenants |
| creditsUsed | DECIMAL | |
| usageType | VARCHAR(30) | chat/document_processing |
| referenceId | UUID | Message/Document ID |

## Indexes

Key performance indexes:
- `bots(tenantId)` — tenant bot listing
- `conversations(botId, createdAt DESC)` — recent conversations
- `messages(conversationId, createdAt)` — message history
- `documents(knowledgeBaseId)` — KB documents
- `flows(tenantId, type)` — tenant flows by type
