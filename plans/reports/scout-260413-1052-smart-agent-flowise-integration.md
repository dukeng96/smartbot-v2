# Scout Report — smart-agent (Flowise) integration feasibility for smartbot-v2

**Date:** 2026-04-13
**Target:** `smart-agent/` = fork of **Flowise v3.0.11**
**Goal:** Assess embedding Flowise's Agentflow V2 canvas (`/v2/agentcanvas/<flow_id>`) into smartbot-v2, each Assistant gắn 1 flow.

---

## TL;DR — Tư vấn ngắn

| Câu hỏi | Câu trả lời |
|---|---|
| Tích hợp được không? | **Có, nhưng lai ghép** (hybrid), không migrate hoàn toàn |
| Migrate từ Flowise sang NestJS? | **Không nên** — dev from scratch sẽ nhanh hơn rewrite Express→NestJS |
| Chiến lược khuyến nghị | Chạy **Flowise server như microservice thứ 4** (bên cạnh genai-platform-api, genai-engine), chỉ **trích xuất UI canvas** nhúng vào Next.js |
| Effort ước tính | **2–3 tuần** cho MVP (1 assistant ↔ 1 flow, chạy được) |
| Rủi ro cao nhất | Auth bridge + UI canvas lift (Redux/MUI/React Router v6.3) vào Next.js 16 App Router |

---

## 1. Stack so sánh nhanh

| Layer | smartbot-v2 | Flowise (smart-agent) | Tương thích |
|---|---|---|---|
| BE framework | NestJS 11 | Express 4 | ❌ Khác hẳn |
| ORM | Prisma 7 | TypeORM 0.3 | ❌ |
| DB | PostgreSQL 16 | PG/MySQL/SQLite | ✅ có thể dùng chung PG instance (khác schema) |
| Auth | JWT + Zustand | JWT + Passport (SSO) | ⚠️ cần bridge |
| Queue | BullMQ + Redis | BullMQ + Redis | ✅ |
| FE framework | Next.js 16 App Router | Vite + React 18 SPA | ❌ |
| UI lib | shadcn/ui v4 + Tailwind | MUI v5 | ❌ mix MUI + shadcn trong 1 route OK |
| State | Zustand + TanStack Query | Redux + Context | ⚠️ |
| Flow engine | None (RAG fix cứng) | LangGraph (`@langchain/langgraph`) | ➕ giá trị chính cần khai thác |
| Canvas | None | React Flow v11.5.6 | ➕ |

**Kết luận:** Hai stack gần như orthogonal. Rewrite Flowise sang NestJS/Prisma = viết lại ~80% codebase → **không khả thi**.

---

## 2. Agentflow V2 — bản chất

- **Không phải entity riêng** — dùng chung bảng `ChatFlow` với field `type: 'AGENTFLOW' | 'CHATFLOW' | 'MULTIAGENT' | 'ASSISTANT'` ([`ChatFlow.ts`](smart-agent/packages/server/src/database/entities/ChatFlow.ts))
- `flowData` = JSON string (React Flow nodes + edges)
- Runtime engine: [`buildAgentflow.ts`](smart-agent/packages/server/src/utils/buildAgentflow.ts) — orchestrate node queue, streaming, loops, human-in-the-loop
- Execution history: bảng `Execution` riêng (state, executionData JSON)
- Multi-tenancy native: `workspaceId` cột trên `ChatFlow`, `Credential`, `Execution`; có Organization → Workspace → User + RBAC ([`enterprise/`](smart-agent/packages/server/src/enterprise/))
- 150+ node types trong `packages/components/` — LLMs, embeddings, retrievers (Qdrant có sẵn ✅), tools, agents
- Streaming: SSE + WebSocket qua `IServerSideEventStreamer`

**Điểm mấu chốt:** Agentflow execution đã production-ready với LangGraph. **Không nên tự viết lại engine** — đó là phần đắt nhất.

---

## 3. Phương án khuyến nghị — "Flowise as a Service"

```
┌──────────────────────────────────────────────────────┐
│ smartbot-web (Next.js 16)                            │
│  - /dashboard/... (existing shadcn UI)               │
│  - /dashboard/bots/[botId]/flow  ← NEW, embeds UI    │
│                                                       │
│    option A: <iframe src="http://flowise:3000/..."/> │
│    option B: extract Canvas.jsx + mount in Next       │
└─────────┬────────────────────────────────────────────┘
          │
          ▼ (token exchange)
┌──────────────────────────────────────────────────────┐
│ genai-platform-api (NestJS)                          │
│  - Bot.flowId (new column) → ChatFlow.id             │
│  - ChatProxyService.processChat:                     │
│      if (bot.flowId) → POST flowise:/predictions/:id │
│      else            → existing RAG path (default)   │
│  - Token bridge: mint Flowise JWT from NestJS JWT    │
└─────────┬────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────┐
│ flowise (Express, port 3100)     ← NEW service       │
│  - Full Flowise server, UI build disabled            │
│  - Only expose: /predictions/:id, /chatflows/*       │
│  - workspaceId = smartbot tenantId (1:1 map)         │
│  - Shares PostgreSQL (flowise schema)                │
└──────────────────────────────────────────────────────┘
```

**Why hybrid wins:**
1. Không đụng engine (`buildAgentflow.ts` + LangGraph) — giữ nguyên battle-tested code
2. NestJS vẫn là "source of truth" cho Bot/Tenant/User/Billing/Quota
3. Có thể xóa Flowise nếu không hợp — không lock-in sâu

---

## 4. Bot ↔ Flow wiring (Prisma)

Thay đổi tối thiểu trên `Bot` (schema.prisma:100-131):

```prisma
model Bot {
  // ... existing fields
  flowId     String?  @map("flow_id") @db.Uuid  // NEW: nullable — có thể default RAG
  flowType   String?  @default("default")       // "default" | "agentflow" | "chatflow"
}
```

Dispatch tại [chat-proxy.service.ts:104-121](genai-platform-api/src/modules/chat-proxy/chat-proxy.service.ts#L104-L121):
```ts
if (bot.flowId && bot.flowType === "agentflow") {
  return this.forwardToFlowise(bot.flowId, message, sessionId);
}
// else: existing path → genai-engine RAG
```

---

## 5. Canvas UI lift — đây là phần khó

Route `/v2/agentcanvas/<flow_id>` nằm ở [`smart-agent/packages/ui/src/views/agentflowsv2/Canvas.jsx`](smart-agent/packages/ui/src/views/agentflowsv2/Canvas.jsx) (811 LOC).

**2 lựa chọn:**

### Option A — iframe embed (quick, 1-2 ngày)
- Build Flowise UI standalone, host port 3100
- Next.js page chỉ chứa `<iframe>` + post-message cho save/load events
- **Ưu:** zero code lift, cập nhật Flowise upstream dễ
- **Nhược:** style lệch (MUI dark vs shadcn light), cross-origin auth phức tạp

### Option B — lift Canvas component vào Next.js (3-5 ngày)
- Copy `views/agentflowsv2/` + dependencies (ReactFlow, node components) vào `smartbot-web`
- Thay thế:
  - Redux `useSelector/useDispatch` → Zustand store mới
  - React Router v6.3 `useNavigate/useParams` → Next.js `useRouter/useParams`
  - MUI `useTheme` → giữ MUI ThemeProvider bên trong route này (co-exist với shadcn OK)
  - axios client → ky client → point tới NestJS proxy
- **Ưu:** UX liền mạch, share auth state
- **Nhược:** lift xong phải maintain fork forever — upstream Flowise changes không auto-merge

**Khuyến nghị:** bắt đầu **Option A** để POC nhanh, nếu thành công chuyển **Option B** khi scale.

---

## 6. Node type tương thích VNPT stack

| Cần có | Flowise sẵn? | Hành động |
|---|---|---|
| VNPT LLM (OpenAI-compatible) | ⚠️ không có node riêng | Dùng `ChatOpenAICustom` với base URL = `https://assistant-stream.vnpt.vn/v1/` — works out of box |
| bge-m3 embeddings | ❌ không có | Dùng `HuggingFaceInference` node nếu VNPT expose, hoặc viết custom node (1 file TS trong `packages/components/nodes/embeddings/`) |
| Qdrant vector store | ✅ sẵn | `Qdrant.ts` node full support |
| Hybrid search + RRF | ❌ không có | Giữ genai-engine như 1 "HTTP Retriever node" custom — best of both worlds |

---

## 7. Roadmap 3 tuần (MVP)

**Week 1 — Infra**
- [ ] Add `flow` service vào [`docker-compose.dev.yml`](docker-compose.dev.yml), share PG
- [ ] Run Flowise migration, create 1 workspace mapped tới 1 tenant (seed script)
- [ ] Bot schema: add `flowId`, `flowType` columns, migration

**Week 2 — Backend bridge**
- [ ] NestJS service `FlowiseBridgeService`: forward chat → Flowise, token mint
- [ ] ChatProxyService dispatch if/else
- [ ] Custom VNPT nodes: bge-m3 embedding + VNPT LLM wrapper (clone `ChatOpenAICustom`)
- [ ] Test 1 flow end-to-end via Postman

**Week 3 — UI**
- [ ] Route `/dashboard/bots/[botId]/flow` → iframe (Option A)
- [ ] Token passthrough via URL query + backend verify
- [ ] Save callback → Bot.flowId update
- [ ] Browser test flow save + bot chat streaming

---

## 8. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Flowise upgrade phá workspace model | High | Pin version, không auto-update; fork on GitHub private |
| MUI + Tailwind style collision | Medium | Scope MUI ThemeProvider chỉ trong `/flow` route |
| Multi-tenant isolation leak | Critical | Strict workspaceId = tenantId mapping, test cross-tenant access |
| Credentials storage conflict (encrypted in Flowise vs env in smartbot) | Medium | Dùng Flowise credential store cho flow-specific keys; smartbot env cho platform keys |
| Auth bridge complexity | High | Bắt đầu với shared JWT secret; nâng cấp OIDC sau |

---

## 9. Unresolved questions

1. **Billing model:** Flow execution dùng credits Flowise hay credits smartbot? Cần quota check ở NestJS **trước khi** forward?
2. **Conversation persistence:** Flowise tự lưu conversation riêng ([Execution entity]) hay NestJS source of truth? Sync 2 chiều?
3. **Credential ownership:** Nếu user cấu hình OpenAI key trong Flowise UI, smartbot có thấy không? Admin audit thế nào?
4. **Upgrade Flowise version:** Có plan để upstream-merge định kỳ không? Hay pin version vĩnh viễn?
5. **Flow marketplace / templates:** Muốn expose marketplace Flowise cho user không? Hay seed vài flow template riêng của smartbot?

---

## Files cited

- [smart-agent/package.json](smart-agent/package.json) — Flowise 3.0.11 monorepo
- [ChatFlow.ts](smart-agent/packages/server/src/database/entities/ChatFlow.ts) — flow entity
- [buildAgentflow.ts](smart-agent/packages/server/src/utils/buildAgentflow.ts) — engine
- [agentflowv2 generator](smart-agent/packages/server/src/services/agentflowv2-generator/index.ts)
- [Canvas.jsx](smart-agent/packages/ui/src/views/agentflowsv2/Canvas.jsx) — 811 LOC canvas
- [CanvasRoutes.jsx](smart-agent/packages/ui/src/routes/CanvasRoutes.jsx) — `/v2/agentcanvas/:id` route
- [chat-proxy.service.ts](genai-platform-api/src/modules/chat-proxy/chat-proxy.service.ts) — existing RAG dispatch
- [schema.prisma:100-131](genai-platform-api/prisma/schema.prisma#L100-L131) — Bot entity
- [rag_chat.py](genai-engine/app/services/rag_chat.py) — current RAG impl
