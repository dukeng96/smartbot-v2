# API Reference

Backend (NestJS :3000) + Engine (FastAPI :8000) endpoints.

## Backend — Public API

All require JWT unless marked `@Public`.

### Auth (`/api/auth`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /register | Public | Create user + tenant |
| POST | /login | Public | Get access + refresh tokens |
| POST | /refresh | Public | Refresh access token |
| POST | /logout | JWT | Invalidate refresh token |
| GET | /me | JWT | Current user profile |

### Users (`/api/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List tenant members |
| GET | /:id | Get user by ID |
| PATCH | /:id | Update user |

### Bots (`/api/bots`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List bots (paginated) |
| POST | / | Create bot (auto-creates flow) |
| GET | /:id | Get bot detail |
| PATCH | /:id | Update bot |
| DELETE | /:id | Soft delete bot |
| POST | /:id/api-key | Regenerate API key |

### Knowledge Bases (`/api/knowledge-bases`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List KBs |
| POST | / | Create KB |
| GET | /:id | Get KB detail |
| PATCH | /:id | Update KB |
| DELETE | /:id | Delete KB |

### Documents (`/api/documents`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List documents (filter by KB) |
| POST | /upload | Upload file to KB |
| GET | /:id | Get document detail |
| DELETE | /:id | Delete document |
| PATCH | /:id/toggle | Enable/disable document |

### Conversations (`/api/conversations`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List conversations |
| GET | /:id | Get conversation + messages |
| DELETE | /:id | Delete conversation |

### Flows (`/api/flows`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /:id | Get flow detail |
| PATCH | /:id | Update flow (canvas save) |
| POST | /:id/validate | Validate DAG |

### Flow Execution (`/api/flow-exec`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /:flowId/execute | Execute flow (SSE stream) |
| POST | /:runId/resume | Resume human_input pause |

### Credentials (`/api/credentials`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List credentials (no secrets) |
| POST | / | Create credential |
| PATCH | /:id | Update credential |
| DELETE | /:id | Delete credential |

### Custom Tools (`/api/custom-tools`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | List tools |
| POST | / | Create tool |
| GET | /:id | Get tool detail |
| PATCH | /:id | Update tool |
| DELETE | /:id | Delete tool |

### Analytics (`/api/analytics`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /overview | Dashboard stats |
| GET | /usage | Credit usage over time |

### Billing (`/api/billing`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /plans | List available plans |
| GET | /subscription | Current subscription |
| POST | /subscribe | Create subscription |

## Backend — Internal API

Requires `X-Internal-Key` header. Used by Engine callbacks.

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | /internal/documents/:id/status | Update document processing status |
| GET | /internal/credentials/:id/decrypt | Get decrypted credential |
| GET | /internal/custom-tools/:id | Get custom tool definition |

## Engine API

All under `/engine/v1`. Most require `X-Internal-Key`.

### Health
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /health | None | Service + dependency status |

### Knowledge Bases
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /knowledge-bases | Create KB (vector collection) |
| DELETE | /knowledge-bases/:id | Delete KB |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /documents/process | Enqueue document processing |

### Chat (Legacy)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /chat | Simple RAG chat (non-flow) |
| POST | /chat/stream | Streaming RAG chat |

### Flows
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /flows/:flowId/execute | Execute flow (SSE) |
| POST | /flows/:executionId/resume | Resume paused flow |

## Common Response Envelope

```json
{
  "data": { ... },
  "statusCode": 200,
  "message": "Success"
}
```

## Pagination

```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

## Error Response

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```
