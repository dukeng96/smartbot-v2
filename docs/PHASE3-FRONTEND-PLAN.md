# End-to-End Frontend Workflow — Smartbot v2
## Claude Code + Figma MCP + agency-agents
## Scope: Admin Platform + Embeddable Widget

> Mục tiêu: cung cấp một workflow thực chiến, end-to-end, để phát triển toàn bộ frontend cho Smartbot v2 bằng **Claude Code**, **Figma MCP**, và các agents từ repo `msitarzewski/agency-agents`, bao gồm cả:
> - **Platform admin SaaS**
> - **Embeddable chat widget**
>
> Tài liệu này ưu tiên cách làm **agent-first nhưng vẫn giữ consistency**, tránh micromanage quá sâu.

---

# 0. Kiến trúc làm việc tổng thể

## 0.1. Tư duy vận hành

Không dùng một siêu prompt để build hết frontend.

Dùng pipeline cố định:

1. **Foundation**
2. **Design extraction**
3. **Implementation**
4. **Evidence QA**
5. **Reality gate**

Với Smartbot v2, chia làm 2 track frontend:

- **Track A — Admin Platform**
- **Track B — Embeddable Widget**

## 0.2. Kết luận kiến trúc repo

Khuyến nghị:

```text
smartbot-v2/
  docs/
  genai-engine/
  genai-platform-api/
  smartbot-web/                   # admin SaaS frontend (Next.js 16)
  smartbot-widget/                # embeddable chat widget — standalone Vite project
    src/
      core/                       # shadow DOM host, lifecycle, event bus
      components/                 # launcher, panel, header, messages, composer, chips
      styles/                     # constructable stylesheets, CSS custom properties
      api/                        # fetch client, SSE stream reader, auth
      utils/                      # format, sanitize, storage helpers
      types/                      # shared TypeScript interfaces
      main.ts                     # IIFE entry — reads data-* attrs, calls init()
    public/
      test-page.html              # local dev embed test page
    vite.config.ts                # library mode → IIFE output
    package.json
    tsconfig.json
    README.md
  packages/
    api-types/                    # shared backend response types (optional)
```

> **Không cần `packages/widget-sdk/` hay `packages/ui-core/`.**
> Widget tự chứa toàn bộ trong 1 file IIFE (<60 KB gzip), load qua `<script defer>`.
> Không share UI tokens/components giữa dashboard và widget — hai design system khác nhau.

## 0.3. Vì sao tách widget riêng?

Widget nhúng có đặc thù rất khác platform:

| Tiêu chí | Admin Platform (smartbot-web) | Widget (smartbot-widget) |
|-----------|-------------------------------|--------------------------|
| Framework | Next.js 16, React, shadcn/ui | Vanilla TypeScript, zero deps |
| Bundle | ~500 KB+ (full SPA) | <60 KB gzip (single IIFE file) |
| CSS isolation | Global Tailwind | Shadow DOM (open mode) + Constructable Stylesheets |
| Theming | CSS variables in `:root` | CSS custom properties truyền qua shadow boundary |
| Auth | JWT access/refresh tokens | Bot API key via `data-bot-id` attribute (token-based, không dùng cookie) |
| Streaming | TanStack Query | fetch ReadableStream (POST SSE) |
| Deploy target | Vercel / static hosting | CDN single file với content-hash versioning |
| Host environment | Controlled (own domain) | Third-party websites (unknown CSS, strict CSP, bất kỳ framework nào) |
| Session | Zustand + httpOnly cookie | localStorage (partitioned per-site trong 2026 browsers) |

**Lý do kỹ thuật cụ thể:**

1. **Shadow DOM isolation** — widget CSS không leak ra host, host CSS không leak vào widget. Không dùng iframe (tốn 10-50 MB memory, khó auto-height với SSE streaming)
2. **Third-party cookie deprecation (2026)** — không thể dùng cookie-based auth, phải dùng bot API key / bearer token
3. **CSP compatibility** — widget phải hoạt động trên sites có strict Content-Security-Policy
4. **Bundle size** — Vanilla TS + Shadow DOM cho ra ~40-60 KB gzip, React/Tailwind sẽ >100 KB
5. **Multiple instances** — một host page có thể nhúng nhiều widget cùng lúc (khác bot)
6. **Backward compatibility** — embed snippet `<script src="...">` phải giữ ổn định contract

=> **Tách widget thành standalone Vite project trong cùng monorepo.** Không share component/UI code với dashboard.

---

# 1. Agents sử dụng

Từ `agency-agents`, dùng 5 vai chính:

1. **UX Architect**
2. **UI Designer**
3. **Frontend Developer**
4. **Evidence Collector**
5. **Reality Checker**

## 1.1. Vai trò từng agent

### UX Architect
Dùng để:
- chốt stack
- chốt route tree
- folder structure
- component architecture
- rendering/isolation strategy cho widget
- build order

### UI Designer
Dùng để:
- rút design system thực dụng từ Figma
- nhận diện repeated patterns
- flag inconsistencies trước khi code

### Frontend Developer
Dùng để:
- scaffold app
- implement screens/module
- integrate API
- giữ typed code và reuse pattern

### Evidence Collector
Dùng để:
- chạy app
- chụp bằng chứng
- so sánh với Figma/spec
- chỉ ra lỗi cụ thể

### Reality Checker
Dùng để:
- làm quality gate
- đánh giá mức production-readiness thật sự

---

# 2. Cài đặt ban đầu

## 2.1. Cài agency-agents cho Claude Code

```bash
git clone https://github.com/msitarzewski/agency-agents.git
cd agency-agents
cp -r ./* ~/.claude/agents/
```

## 2.2. Cấu hình Figma MCP

Khuyến nghị dùng **Remote MCP** trước.

### Add remote Figma MCP

```bash
claude mcp add --transport http figma-remote-mcp https://mcp.figma.com/mcp
```

Sau đó:

1. restart Claude Code
2. gõ `/mcp`
3. login và authorize Figma
4. kiểm tra server đã connected

### Tùy chọn: add desktop MCP

```bash
claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp
```

Dùng khi muốn chọn frame trực tiếp trong Figma desktop app.

---

# 3. Tài liệu cần có trong repo

Hiện anh/chị đã có:

- `docs/backend-api-reference.md`
- `docs/figma-screen-spec.md`
- `docs/STITCH-PROMPTS.md`
- `docs/code-standards.md`
- `docs/codebase-summary.md`
- `docs/system-architecture.md`
- `docs/PHASE1-WEB-BACKEND-PLAN.md`
- `docs/PHASE2-AI-ENGINE-PLAN.md`

Sẽ tạo thêm:

## Platform docs
- `docs/frontend-architecture.md`
- `docs/frontend-ui-rules.md`
- `docs/frontend-build-order.md`
- `docs/frontend-design-system.md`
- `docs/frontend-implementation-log.md`

## Widget docs
- `docs/widget-architecture.md`
- `docs/widget-build-plan.md`
- `docs/widget-design-system.md`
- `docs/widget-implementation-log.md`

## QA docs
- `docs/qa-*.md`
- `docs/frontend-reality-check.md`
- `docs/widget-reality-check.md`

---

# 4. CLAUDE.md mẫu nên thêm vào root repo

Tạo file `CLAUDE.md` ở root:

```md
# Smartbot v2 — Claude working rules

## General
- This repo contains a backend-complete AI assistant SaaS platform plus a separate embeddable widget.
- Figma is the visual source of truth for all frontend implementation.
- Always read docs before coding.
- Preserve existing architecture and shared patterns.
- Do not redesign the shell or invent new styles without strong reason.
- Prefer reusable components over one-off implementations.

## Required docs to read before frontend work
- docs/backend-api-reference.md
- docs/figma-screen-spec.md
- docs/code-standards.md
- docs/system-architecture.md
- docs/frontend-architecture.md
- docs/frontend-ui-rules.md
- docs/frontend-design-system.md
- docs/widget-architecture.md
- docs/widget-design-system.md

## Figma MCP rules
- Always use Figma MCP when implementing or reviewing a screen that exists in Figma.
- Prefer frame links or current Figma selection over reinterpreting screenshots manually.
- If Figma MCP returns localhost image or SVG asset sources, use those assets directly.
- Do not add new icon packages if required assets already exist from Figma MCP.
- Do not create placeholder graphics if Figma MCP already provides assets.

## Platform rules
- smartbot-web is the admin SaaS app.
- Keep desktop-first SaaS layout consistency.
- Reuse shell, sidebar, page header, cards, tabs, tables, forms, dialogs, banners.
- Vietnamese UI copy by default.
- Every page must handle loading, empty, error, and success states.

## Widget rules
- smartbot-widget is independent from smartbot-web.
- Optimize for embeddability, isolation, and low integration friction.
- Avoid assumptions about host framework.
- Keep widget bundle small.
- Prefer Shadow DOM or equivalent isolation strategy.
- Do not share large dashboard components with widget.

## Workflow rules
- Work in phases.
- After each module, create QA evidence docs.
- Before declaring production-ready, run Reality Checker.
```

---

# 5. End-to-end workflow overview

## 5.1. Phase map

### Phase P0 — Setup
- cài agents
- cài Figma MCP
- thêm `CLAUDE.md`

### Phase P1 — Platform foundation docs
- UX Architect
- UI Designer

### Phase P2 — Platform foundation code
- Frontend Developer
- Evidence Collector

### Phase P3 — Platform modules
- Auth + Onboarding
- Dashboard
- Bots
- Knowledge Bases + Documents
- Conversations
- Analytics
- Billing
- Settings

### Phase P4 — Platform gate
- Reality Checker

### Phase W1 — Widget architecture
- UX Architect
- UI Designer

### Phase W2 — Widget scaffold & MVP
- Frontend Developer
- Evidence Collector

### Phase W3 — Widget hardening
- Frontend Developer
- Evidence Collector
- Reality Checker

### Phase I1 — Integration & release readiness
- Platform + Widget integration review
- final reality checks

---

# 6. Platform workflow chi tiết

## Phase P1 — Platform foundation docs

### Prompt P1.1 — UX Architect for platform

```text
Activate UX Architect mode.

Context:
- This repo contains backend-complete docs for Smartbot v2, a Vietnamese GenAI Assistant Platform.
- The backend is complete and working.
- Figma for all main platform screens is already finalized.

Read first:
- docs/backend-api-reference.md
- docs/figma-screen-spec.md
- docs/code-standards.md
- docs/system-architecture.md
- docs/codebase-summary.md

Then use Figma MCP to inspect the main Smartbot platform frames.

Task:
Design the frontend technical foundation for /smartbot-web based on the backend docs and the actual Figma structure.

Deliverables:
1. Create docs/frontend-architecture.md
2. Create docs/frontend-ui-rules.md
3. Create docs/frontend-build-order.md

Include:
- recommended frontend stack
- route architecture
- folder structure
- shared layout structure
- component layering
- data fetching and API client strategy
- auth and session handling strategy
- build order for all platform modules

Constraints:
- Figma is the visual source of truth
- Preserve repeated shells and patterns from Figma
- Optimize for consistency across many admin screens
- Vietnamese UI by default
- Do not implement pages yet
```

### Prompt P1.2 — UI Designer for platform

```text
Activate UI Designer mode.

Context:
- Platform frontend architecture docs are being established.
- Figma is finalized for the main Smartbot platform screens.

Read first:
- docs/figma-screen-spec.md
- docs/frontend-architecture.md

Then use Figma MCP to inspect the finalized Smartbot platform screens.

Task:
Extract an implementation-oriented design system for the admin platform.

Deliverables:
1. Create docs/frontend-design-system.md
2. Identify repeated visual and interaction patterns
3. Flag inconsistencies that should be normalized before coding

Include:
- color roles
- semantic statuses
- typography scale
- spacing rhythm
- border radius and shadows
- sidebar pattern
- page header pattern
- cards
- tables
- tabs
- forms
- dialogs
- empty states
- upgrade banners
- quota/usage display patterns

Constraints:
- Be implementation-oriented, not abstract
- Prefer reusable patterns
- Minimize design drift during coding
```

---

## Phase P2 — Platform foundation code

### Prompt P2.1 — Frontend Developer scaffold platform

```text
Activate Frontend Developer mode.

Read first:
- docs/frontend-architecture.md
- docs/frontend-ui-rules.md
- docs/frontend-build-order.md
- docs/frontend-design-system.md
- docs/backend-api-reference.md
- docs/figma-screen-spec.md

Use Figma MCP to inspect the relevant shell and foundational frames before implementation.

Task:
Initialize the admin frontend app in /smartbot-web and implement the shared foundation only.

Deliverables:
1. Create the frontend app with the agreed stack
2. Implement:
   - routing foundation
   - app shell
   - sidebar
   - top header
   - tokens/theme setup
   - shared UI primitives
   - page header
   - table shell
   - form shell
   - dialog/modal shell
   - empty/loading/error states
3. Add placeholder route pages for all major platform sections
4. Add README for running the frontend locally

Constraints:
- Match the actual Figma structure
- Do not redesign the shell
- Reuse shared patterns
- No business logic yet
- No random styles
```

### Prompt P2.2 — Evidence Collector review platform foundation

```text
Activate Evidence Collector mode.

Task:
Review the platform frontend foundation in /smartbot-web.

Instructions:
1. Run the app
2. Navigate through the shell and placeholder routes
3. Collect screenshot evidence
4. Compare visible UI against:
   - docs/frontend-ui-rules.md
   - docs/frontend-design-system.md
   - docs/figma-screen-spec.md
   - relevant Figma frames via Figma MCP
5. Report:
   - what matches
   - what is missing
   - visual inconsistencies
   - layout issues
   - at least 5 concrete issues with severity

Output:
Create docs/qa-platform-foundation.md
```

### Prompt P2.3 — Frontend Developer fix platform foundation

```text
Activate Frontend Developer mode.

Read:
- docs/qa-platform-foundation.md

Task:
Fix all critical and medium issues found in the platform foundation QA report.
Preserve the existing architecture and shared patterns.

Output:
Update docs/qa-platform-foundation.md with a short resolution summary.
```

---

## Phase P3 — Platform module implementation

## Module order
1. Auth + Onboarding
2. Dashboard
3. Bots
4. Knowledge Bases + Documents
5. Conversations
6. Analytics
7. Billing
8. Settings

---

### Prompt template — Platform module implementation

```text
Activate Frontend Developer mode.

Read first:
- docs/frontend-architecture.md
- docs/frontend-ui-rules.md
- docs/frontend-build-order.md
- docs/frontend-design-system.md
- docs/backend-api-reference.md
- docs/figma-screen-spec.md

Use Figma MCP to inspect the relevant frames for this module before implementation.

Current task:
Implement the [MODULE NAME] module in /smartbot-web.

Deliverables:
1. Implement the route pages for this module
2. Integrate with real backend APIs where available
3. Implement validation, loading, error, empty, and success states
4. Create reusable business components for this module
5. Keep code typed and clean
6. Update docs/frontend-implementation-log.md with:
   - routes implemented
   - components added
   - API endpoints integrated
   - known follow-ups

Constraints:
- Preserve existing architecture and shared patterns
- Do not redesign previously implemented screens
- Use Vietnamese UI copy by default
- Reuse shared primitives first
```

---

### Module P3.1 — Auth + onboarding

```text
Activate Frontend Developer mode.

Read first:
- docs/frontend-architecture.md
- docs/frontend-ui-rules.md
- docs/frontend-design-system.md
- docs/backend-api-reference.md
- docs/figma-screen-spec.md

Use Figma MCP to inspect the auth and onboarding frames.

Task:
Implement the Auth + Onboarding module in /smartbot-web.

Scope:
- login
- register
- forgot password
- initial workspace creation or first-run step if represented in Figma
- first assistant creation flow
- first knowledge base upload flow
- success/next-step states

Deliverables:
1. Implement the full auth screens
2. Integrate the relevant auth APIs
3. Implement onboarding flow screens and transitions
4. Add form validation and API error handling
5. Update docs/frontend-implementation-log.md

Constraints:
- Preserve shared shell where applicable
- Use Vietnamese UI
- Match Figma closely
```

### QA prompt for Auth + Onboarding

```text
Activate Evidence Collector mode.

Task:
Review the Auth + Onboarding module in /smartbot-web.

Instructions:
1. Run the app
2. Navigate through all auth and onboarding routes
3. Collect screenshot evidence
4. Compare against docs/figma-screen-spec.md, docs/frontend-design-system.md, and Figma MCP frames
5. Report at least 5 concrete issues with severity

Output:
Create docs/qa-auth-onboarding.md
```

### Fix prompt for Auth + Onboarding

```text
Activate Frontend Developer mode.

Read:
- docs/qa-auth-onboarding.md

Task:
Fix all critical and medium issues from the auth and onboarding QA report.
Preserve architecture and shared patterns.

Output:
Update docs/qa-auth-onboarding.md with a resolution summary.
```

---

### Module P3.2 — Dashboard

```text
Activate Frontend Developer mode.

Read first:
- docs/frontend-architecture.md
- docs/frontend-ui-rules.md
- docs/frontend-design-system.md
- docs/backend-api-reference.md
- docs/figma-screen-spec.md

Use Figma MCP to inspect the dashboard frames.

Task:
Implement the Dashboard module in /smartbot-web.

Scope:
- dashboard overview
- KPI cards
- usage / credits summaries
- recent activity or quick actions if present
- basic loading and empty states

Deliverables:
1. Implement the dashboard page
2. Integrate relevant analytics / overview APIs
3. Reuse the established KPI card and page header patterns
4. Update docs/frontend-implementation-log.md

Constraints:
- Keep the dashboard executive-friendly and clean
- Do not invent new KPI styles
- Use Vietnamese UI
```

### Module P3.3 — Bots

```text
Activate Frontend Developer mode.

Read first:
- docs/frontend-architecture.md
- docs/frontend-ui-rules.md
- docs/frontend-design-system.md
- docs/backend-api-reference.md
- docs/figma-screen-spec.md

Use Figma MCP to inspect the Bots and Assistant Config frames.

Task:
Implement the Bots module in /smartbot-web.

Scope:
- bot list
- create bot dialog
- bot detail
- tabs:
  - General
  - Personality
  - Widget
  - API & Embed
  - Knowledge Bases
  - Channels
- preview panels where shown in Figma

Deliverables:
1. Implement all scoped pages and tabs
2. Integrate related backend APIs
3. Implement form state, validation, save flows, and success/error handling
4. Reuse the settings-page layout consistently
5. Update docs/frontend-implementation-log.md

Constraints:
- Match Figma closely
- Preserve shared settings-tab layout
- Reuse banners, cards, tables, and dialogs
- Use Vietnamese UI
```

### Module P3.4 — Knowledge Bases + Documents

```text
Activate Frontend Developer mode.

Read first:
- docs/frontend-architecture.md
- docs/frontend-ui-rules.md
- docs/frontend-design-system.md
- docs/backend-api-reference.md
- docs/figma-screen-spec.md

Use Figma MCP to inspect the Knowledge Base and Document Detail frames.

Task:
Implement the Knowledge Bases + Documents module in /smartbot-web.

Scope:
- knowledge base list
- create knowledge base dialog
- knowledge base detail
- documents table
- upload file dialog
- add URL dialog
- raw text dialog
- document processing states:
  - pending
  - extracting
  - chunking
  - embedding
  - completed
  - error
- document detail if shown
- reprocess and delete flows

Deliverables:
1. Implement all scoped screens and dialogs
2. Integrate relevant backend APIs
3. Handle operational states clearly
4. Implement strong loading, progress, error, and empty states
5. Update docs/frontend-implementation-log.md

Constraints:
- This is a core operational module
- Status visibility must be extremely clear
- Do not simplify away important states from Figma/spec
- Use Vietnamese UI
```

### Module P3.5 — Conversations

```text
Activate Frontend Developer mode.

Read first:
- docs/frontend-architecture.md
- docs/frontend-ui-rules.md
- docs/frontend-design-system.md
- docs/backend-api-reference.md
- docs/figma-screen-spec.md

Use Figma MCP to inspect the Conversations and Conversation Detail frames.

Task:
Implement the Conversations module in /smartbot-web.

Scope:
- conversations list/inbox
- conversation detail
- message thread
- filters
- rating and feedback UI
- search if present

Deliverables:
1. Implement the conversations pages
2. Integrate relevant backend APIs
3. Preserve the admin-product feel while supporting chat-like interaction
4. Update docs/frontend-implementation-log.md

Constraints:
- Do not make it feel like a consumer messenger app
- Keep strong operational clarity
- Use Vietnamese UI
```

### Module P3.6 — Analytics

```text
Activate Frontend Developer mode.

Read first:
- docs/frontend-architecture.md
- docs/frontend-ui-rules.md
- docs/frontend-design-system.md
- docs/backend-api-reference.md
- docs/figma-screen-spec.md

Use Figma MCP to inspect the Analytics frames.

Task:
Implement the Analytics module in /smartbot-web.

Scope:
- analytics overview
- conversations over time
- messages over time
- credit usage over time
- channel breakdown
- top questions
- satisfaction / ratings

Deliverables:
1. Implement all scoped analytics pages or sections
2. Integrate backend analytics APIs
3. Reuse KPI cards and chart-card patterns consistently
4. Update docs/frontend-implementation-log.md

Constraints:
- Keep charts clean and executive-friendly
- No flashy visual treatment
- Use Vietnamese UI
```

### Module P3.7 — Billing

```text
Activate Frontend Developer mode.

Read first:
- docs/frontend-architecture.md
- docs/frontend-ui-rules.md
- docs/frontend-design-system.md
- docs/backend-api-reference.md
- docs/figma-screen-spec.md

Use Figma MCP to inspect the Billing, Plans, Subscription, Credit Top-up, and Payment History frames.

Task:
Implement the Billing module in /smartbot-web.

Scope:
- plans and pricing
- current subscription
- credit usage
- top-up credits flow
- payment history
- upgrade prompts
- cancel flow

Deliverables:
1. Implement billing pages and dialogs
2. Integrate backend billing APIs
3. Keep usage/quota/upgrade messaging clear and trustworthy
4. Update docs/frontend-implementation-log.md

Constraints:
- Preserve pricing and usage patterns from Figma
- Avoid visual inconsistency with the rest of the product
- Use Vietnamese UI
```

### Module P3.8 — Settings

```text
Activate Frontend Developer mode.

Read first:
- docs/frontend-architecture.md
- docs/frontend-ui-rules.md
- docs/frontend-design-system.md
- docs/backend-api-reference.md
- docs/figma-screen-spec.md

Use Figma MCP to inspect the Settings frames.

Task:
Implement the Settings module in /smartbot-web.

Scope:
- workspace settings
- profile settings
- member/team settings if represented in Figma

Deliverables:
1. Implement all scoped settings pages
2. Integrate relevant backend APIs
3. Preserve settings-page consistency
4. Update docs/frontend-implementation-log.md

Constraints:
- Reuse page header, form, section, and action patterns
- Use Vietnamese UI
```

---

## QA template after each platform module

```text
Activate Evidence Collector mode.

Task:
Review the [MODULE NAME] module in /smartbot-web.

Instructions:
1. Run the app
2. Navigate through all implemented routes in this module
3. Collect screenshot evidence
4. Compare against:
   - docs/frontend-design-system.md
   - docs/frontend-ui-rules.md
   - docs/figma-screen-spec.md
   - relevant Figma MCP frames
5. Report:
   - what matches
   - what is missing
   - visual inconsistencies
   - interaction issues
   - state handling gaps
   - at least 5 concrete issues with severity

Output:
Create docs/qa-[module-name].md
```

## Fix template after each platform module QA

```text
Activate Frontend Developer mode.

Read:
- docs/qa-[module-name].md

Task:
Fix all critical and medium issues in the QA report for [MODULE NAME].
Preserve existing architecture and shared patterns.

Output:
Update docs/qa-[module-name].md with a short resolution summary.
```

---

## Phase P4 — Platform quality gate

### Prompt P4.1 — Platform reality check

```text
Activate Reality Checker mode.

Task:
Assess the production readiness of /smartbot-web.

Read:
- docs/frontend-architecture.md
- docs/frontend-ui-rules.md
- docs/frontend-design-system.md
- docs/figma-screen-spec.md
- docs/backend-api-reference.md
- docs/frontend-implementation-log.md
- all docs/qa-*.md relevant to platform

Use Figma MCP where useful to verify key screens.

Output:
Create docs/frontend-reality-check.md with:
- overall quality rating
- system completeness
- consistency assessment
- biggest missing pieces
- launch risks
- honest verdict: FAILED / NEEDS WORK / READY
```

---

# 7. Widget workflow chi tiết

## Widget product boundary

### Functional scope

Widget gồm:
- **Launcher bubble** — floating button (bottom-right/left), custom icon, unread badge
- **Chat panel** — open/close animation, header, message area, composer
- **Greeting** — bot greeting message hiện khi mở lần đầu
- **Suggestion chips** — danh sách câu hỏi gợi ý, click để gửi
- **Composer** — text input + send button, Enter to send, Shift+Enter newline
- **Streaming chat** — SSE via fetch ReadableStream (POST), hiện typing indicator, accumulate chunks
- **Session persistence** — conversationId + endUserId trong localStorage (partitioned per-site)
- **Theming** — CSS custom properties truyền qua shadow boundary, dark/light mode, custom primary color
- **Header text** — configurable qua data attribute hoặc API config
- **Branding toggle** — "Powered by Smartbot" footer, ẩn/hiện qua config
- **Public embed script/init** — single `<script defer>` tag với data attributes

### Technical constraints (from research)

| Constraint | Decision | Rationale |
|-----------|----------|-----------|
| CSS isolation | Shadow DOM (open mode) | Prevents host ↔ widget style leaks; cheaper than iframe (10-50 MB/instance) |
| Styling engine | Constructable Stylesheets (`new CSSStyleSheet()` + `adoptedStyleSheets`) | Efficient, no FOUC, shareable across shadow roots |
| Theming interface | CSS custom properties on host element | Pass through shadow boundary; runtime switchable without recompilation |
| Framework | Vanilla TypeScript, zero external deps | Bundle <60 KB gzip; avoids framework version conflicts with host |
| Build tool | Vite library mode → IIFE output | Single self-contained file; `smartbot-widget.iife.js` |
| Bundle target | <60 KB gzip (ideally 40 KB) | Competitive with best-in-class (Typebot ~5-10 KB, Botpress ~20-40 KB) |
| Script loading | `<script defer src="...">` + auto-init from `document.currentScript.dataset` | Non-blocking; config via HTML attributes |
| Auth model | Bot API key in data attribute → Bearer token header | Third-party cookie deprecated 2026; no cookie-based auth |
| Chat streaming | `fetch()` + `ReadableStream` (POST request) | EventSource is GET-only, chat needs POST body |
| Reconnection | Exponential backoff (1s → 2s → 4s → max 30s) | Resilient to network interruptions |
| Session storage | localStorage (partitioned per-site in modern browsers) | Simple; no cross-origin issues |
| Multiple instances | `SmartbotWidget.init(config, containerSelector?)` per bot | Each instance gets own shadow root |
| CDN deploy | Content-hash filename + long-lived cache headers | `smartbot-widget.a1b2c3.iife.js`; immutable deploys |
| Accessibility | `role="log"`, `aria-live="polite"`, focus management, keyboard nav | Required for WCAG compliance inside shadow DOM |
| CSP compat | No `eval()`, no inline styles via `.style`, all styles via Constructable Stylesheets | Works on strict-CSP sites |

### 3 embed modes

1. **Bubble** (primary) — `<script defer src="..." data-bot-id="xxx">` → floating launcher + panel
2. **Container/Inline** — `<div id="smartbot-container"></div>` + `SmartbotWidget.init({botId, mode: 'inline'}, '#smartbot-container')` → embeds directly in page flow
3. **Direct link** — standalone HTML page at `/widget/:botId` served by smartbot-web or CDN → full-page chat

### Public JavaScript API

```typescript
// Auto-init from script tag data attributes (bubble mode)
// <script defer src="https://cdn.smartbot.vn/widget/v1/smartbot-widget.iife.js"
//         data-bot-id="bot_xxx"
//         data-primary-color="#6D28D9"
//         data-position="bottom-right"
//         data-theme="light">

// Programmatic API
SmartbotWidget.init({ botId: 'bot_xxx', theme: 'dark', primaryColor: '#6D28D9' });
SmartbotWidget.open();
SmartbotWidget.close();
SmartbotWidget.toggle();
SmartbotWidget.reset();    // clear conversation, start fresh
SmartbotWidget.destroy();  // remove widget from DOM
```

Không coi widget là một page bên trong platform.

---

## Phase W1 — Widget architecture docs

### Prompt W1.1 — UX Architect for widget

```text
Activate UX Architect mode.

Context:
- Smartbot has a separate embeddable chat widget for third-party websites.
- Widget is a standalone Vite project at /smartbot-widget (NOT part of Next.js admin app).
- Backend APIs already exist: GET /api/v1/chat/:botId/config, POST /api/v1/chat/:botId/messages (SSE).

Read first:
- docs/backend-api-reference.md
- docs/figma-screen-spec.md (Section I — Embed Chat Widget)
- docs/system-architecture.md
- docs/code-standards.md

Read research reports for technical decisions:
- plans/reports/researcher-widget-opensource-landscape.md
- plans/reports/researcher-widget-reference-implementations.md
- plans/reports/researcher-widget-embedding-best-practices.md

Use Figma MCP to inspect the widget-related frames.

Task:
Design the frontend architecture for /smartbot-widget based on research findings.

Deliverables:
1. Create docs/widget-architecture.md
2. Create docs/widget-build-plan.md

Required architectural decisions (research-backed):

**Isolation strategy:**
- Shadow DOM (open mode) as primary CSS isolation mechanism
- Constructable Stylesheets (`new CSSStyleSheet()` + `adoptedStyleSheets`) for style injection
- No iframe by default (10-50 MB overhead per instance); iframe only as opt-in mode
- Custom events with `composed: true` to cross shadow boundary

**Tech stack:**
- Vanilla TypeScript, zero external runtime dependencies
- Vite library mode → IIFE output (`smartbot-widget.iife.js`)
- Bundle target: <60 KB gzip
- No React, Vue, or any framework (avoids version conflicts with host)

**Theming model:**
- CSS custom properties as theming interface (pass through shadow boundary)
- Host-side: `--smartbot-primary-color`, `--smartbot-bg`, `--smartbot-text`, etc.
- Widget reads from `:host` with fallback defaults
- Dark/light mode detection via `prefers-color-scheme` + manual override
- Runtime switchable without page reload

**Embed & initialization:**
- `<script defer src="...">` tag as primary delivery mechanism
- Auto-init from `document.currentScript.dataset` (data-bot-id, data-primary-color, etc.)
- Programmatic API: `SmartbotWidget.init(config)`, `.open()`, `.close()`, `.toggle()`, `.reset()`, `.destroy()`
- Support multiple instances per page (each with own shadow root)
- 3 modes: bubble (floating), inline (container), direct-link (standalone page)

**Auth & API:**
- Bot API key passed via data-bot-id attribute
- Bearer token auth for API calls (NOT cookies — third-party cookies deprecated 2026)
- Auth hierarchy: user token > bot API key > anonymous session
- CORS required on backend for third-party origins

**Streaming:**
- `fetch()` + `ReadableStream` for POST-based SSE chat streaming
- NOT EventSource (GET-only, can't send POST body)
- Reconnection with exponential backoff (1s → 2s → 4s → max 30s)
- Typing indicator during stream

**Session/state:**
- localStorage for conversationId + endUserId persistence
- Partitioned storage in modern browsers (per-site, not per-origin)
- Lightweight internal state management (no Zustand/Redux — vanilla)

**Folder structure:**
```
smartbot-widget/
  src/
    core/           # shadow-dom-host.ts, lifecycle.ts, event-bus.ts, widget-api.ts
    components/     # launcher.ts, panel.ts, header.ts, message-list.ts, message-bubble.ts,
                    # composer.ts, suggestion-chips.ts, typing-indicator.ts
    styles/         # theme.css (constructable), animations.css, reset.css
    api/            # client.ts (fetch wrapper), sse-reader.ts, config-loader.ts
    utils/          # sanitize.ts, format.ts, storage.ts, dom.ts
    types/          # widget-config.ts, message.ts, api-responses.ts
    main.ts         # IIFE entry point
  public/
    test-page.html  # local dev test with multiple embed scenarios
  vite.config.ts
```

**CDN deployment:**
- Content-hash filenames: `smartbot-widget.a1b2c3.iife.js`
- Immutable cache headers (max-age=31536000)
- Version manifest for admin platform to reference latest URL

**Security checklist for architecture doc:**
- Input sanitization (DOMPurify or manual) for all rendered content
- postMessage origin validation if iframe mode used
- No eval(), no inline event handlers, no dynamic script injection
- CSP-compatible: all styles via Constructable Stylesheets, not inline style=""
- Rate limiting awareness (don't flood backend on reconnect)

**Accessibility:**
- `role="log"` on message container, `aria-live="polite"` for new messages
- Focus management: trap focus in open panel, return focus on close
- Keyboard navigation: Tab through interactive elements, Escape to close
- Screen reader announcements for streaming completion

Constraints:
- Optimize for embeddability, low conflict risk, and maintainability
- Do not assume the host website is React or any specific framework
- Must work on sites with strict Content-Security-Policy
- Prefer isolation and reliability over cleverness
```

### Prompt W1.2 — UI Designer for widget design system

```text
Activate UI Designer mode.

Context:
- Widget is a standalone Vite project at /smartbot-widget (NOT part of Next.js admin app).
- All UI renders inside Shadow DOM via Constructable Stylesheets — no global CSS.
- Bundle target <60 KB gzip; vanilla TypeScript; zero external UI deps.
- Theming via CSS custom properties on :host, passed through shadow boundary.

Read first:
- docs/widget-architecture.md (created by W1.1)
- docs/widget-build-plan.md (created by W1.1)
- docs/figma-screen-spec.md (Section I — Embed Chat Widget)
- docs/frontend-ui-rules.md (for platform token reference — widget is independent but should feel related)
- plans/reports/researcher-widget-reference-implementations.md (Typebot patterns)

Use Figma MCP to inspect widget-related frames.

Task:
Create an implementation-oriented design system for the widget that works entirely inside Shadow DOM with Constructable Stylesheets.

Deliverables:
1. Create docs/widget-design-system.md

2. Define every visual element with exact CSS-in-TS specs (since no global CSS):

   **Launcher bubble:**
   - Size, border-radius, shadow, position (fixed bottom-right/left)
   - Unread badge (count, position, animation)
   - Open/close transition (scale + opacity, ~200ms ease-out)
   - Custom icon via URL or default SVG inline

   **Panel shell:**
   - Width (fixed 380px desktop, 100vw mobile), max-height (600px desktop, 100vh mobile)
   - Border-radius, shadow, z-index strategy (99999 range)
   - Entry animation (slide-up + fade, ~250ms)
   - Mobile breakpoint behavior (<480px → fullscreen overlay)

   **Header:**
   - Bot avatar (32px circle), bot name, status dot, close button
   - Background: uses --smartbot-primary-color

   **Message list:**
   - Scroll container with auto-scroll on new messages
   - Bot bubble (left-aligned, light bg) vs user bubble (right-aligned, primary bg)
   - Timestamp display (relative, Vietnamese locale)
   - Markdown rendering rules (bold, italic, links, code blocks — inline only, no heavy parser)

   **Composer:**
   - Input area with send button, auto-resize textarea
   - Enter to send, Shift+Enter newline
   - Disabled state during streaming
   - Character limit indicator if needed

   **Suggestion chips:**
   - Horizontal scrollable row below greeting
   - Pill-shaped, border style, click → send as message

   **Streaming/typing indicator:**
   - Three-dot bounce animation during SSE stream
   - Progressive text reveal (character-by-character or chunk-by-chunk)

   **States:**
   - Loading: skeleton for panel, spinner for messages
   - Empty: greeting message + suggestion chips
   - Error: inline error bar with retry button (not modal — widget should never block host page)
   - Offline: reconnecting indicator with backoff status

   **Theming tokens (CSS custom properties):**
   - Map every designable property to a --smartbot-* variable
   - Define light/dark mode defaults
   - Document which properties are user-configurable via admin platform vs internal-only

   **Mobile / narrow-width behavior:**
   - <480px: fullscreen overlay, no launcher visible when open
   - Gesture: swipe-down to minimize (optional, flag as nice-to-have)

3. List what is independent from admin platform (everything) vs what shares conceptual alignment (brand colors, avatar convention)

4. Flag Figma inconsistencies found during MCP inspection

Constraints:
- Every style must be expressible as Constructable Stylesheet (no Tailwind, no CSS modules)
- All colors must use CSS custom properties for runtime theming
- All sizing must account for Shadow DOM boundary (no vh/vw assumptions in non-fullscreen mode)
- Keep the design system document implementation-oriented — skip theory, give exact values
```

---

## Phase W2 — Shadow DOM scaffold + core components

Goal: working widget scaffold with Shadow DOM isolation, Constructable Stylesheets, Vite IIFE build, and all visual components rendering with mock data.

### Prompt W2.1 — Scaffold Vite project + Shadow DOM host

```text
Activate Frontend Developer mode.

Read first:
- docs/widget-architecture.md
- docs/widget-build-plan.md
- docs/widget-design-system.md
- docs/figma-screen-spec.md (Section I)

Task:
Scaffold /smartbot-widget as a standalone Vite library project with Shadow DOM isolation.

Implementation steps:

1. **Vite project setup:**
   - `npm create vite@latest smartbot-widget -- --template vanilla-ts`
   - Configure vite.config.ts for library mode:
     - `build.lib.entry`: src/main.ts
     - `build.lib.name`: SmartbotWidget
     - `build.lib.formats`: ['iife']
     - `build.lib.fileName`: smartbot-widget
     - `build.rollupOptions.output.entryFileNames`: smartbot-widget.[hash].iife.js
   - Add dev server with test-page.html that loads the IIFE script

2. **Shadow DOM host (src/core/shadow-dom-host.ts):**
   - Create custom element or direct `attachShadow({mode: 'open'})` on injected container
   - Load styles via `new CSSStyleSheet()` + `shadowRoot.adoptedStyleSheets = [...]`
   - Provide `render(html)` utility for shadow root content management
   - Handle multiple instances (each call to `init()` creates separate shadow root)

3. **Constructable Stylesheets (src/styles/):**
   - `reset.css.ts` — minimal reset for shadow DOM (box-sizing, font inheritance)
   - `theme.css.ts` — all CSS custom properties with defaults, `:host` declarations
   - `animations.css.ts` — launcher open/close, panel slide-up, typing dots
   - Each file exports a `CSSStyleSheet` instance created via `new CSSStyleSheet()`

4. **IIFE entry point (src/main.ts):**
   - Read config from `document.currentScript?.dataset` for auto-init (bubble mode)
   - Expose `window.SmartbotWidget = { init, open, close, toggle, reset, destroy }`
   - `init(config, containerSelector?)`:
     - If no container → bubble mode (create fixed-position container)
     - If container → inline mode (embed in specified element)
     - Create shadow root, load stylesheets, render widget shell
   - Guard against double-init on same container

5. **Test page (public/test-page.html):**
   - Include 3 embed scenarios: bubble (script tag), inline (div + init), both on same page
   - Add host-page styles that would typically conflict (font resets, button styles, etc.)
   - Show that widget remains isolated

Deliverables:
- /smartbot-widget scaffolded and building to IIFE
- Shadow DOM host working with Constructable Stylesheets
- `SmartbotWidget.init()` auto-initializing from script tag data attributes
- Test page demonstrating isolation
- README.md with local dev and embed instructions

Constraints:
- Zero external runtime dependencies
- Must build to single IIFE file
- All styles via Constructable Stylesheets (no <style> injection, no inline styles)
- No eval(), no dynamic script loading — CSP-compatible
```

### Prompt W2.2 — Build widget UI components

```text
Activate Frontend Developer mode.

Read first:
- docs/widget-architecture.md
- docs/widget-design-system.md
- docs/figma-screen-spec.md (Section I)

Use Figma MCP to inspect widget frames for visual reference.

Task:
Build all widget UI components inside the Shadow DOM scaffold from W2.1.
Use mock data for all interactions (no backend calls yet).

Build order (each component is a TypeScript class/module rendering into shadow root):

1. **Launcher bubble (src/components/launcher.ts):**
   - Fixed position button (configurable bottom-right/left)
   - Custom icon via URL or inline SVG default
   - Unread badge with count
   - Click → toggle panel open/close
   - Open/close animation (scale + opacity)

2. **Panel shell (src/components/panel.ts):**
   - Container: 380px width, max 600px height, border-radius, shadow
   - Slide-up + fade entry animation
   - Contains: header → message-list → composer (flex column layout)
   - Mobile: fullscreen overlay at <480px

3. **Header (src/components/header.ts):**
   - Bot avatar (32px circle), bot name text, online status dot
   - Close button (X icon) on right
   - Background uses --smartbot-primary-color

4. **Message list (src/components/message-list.ts):**
   - Scrollable container with auto-scroll to bottom on new messages
   - Renders array of MessageBubble components
   - Greeting message shown as first bot message

5. **Message bubble (src/components/message-bubble.ts):**
   - Bot messages: left-aligned, light background, bot avatar
   - User messages: right-aligned, primary color background, white text
   - Timestamp (relative, Vietnamese — implement simple formatter, no date-fns)
   - Basic markdown: **bold**, *italic*, `code`, [links](url) — regex-based, no heavy parser

6. **Composer (src/components/composer.ts):**
   - Auto-resizing textarea (min 1 row, max 4 rows)
   - Send button (icon) — enabled only when input non-empty
   - Enter → send, Shift+Enter → newline
   - Disabled state (greyed out during streaming)

7. **Suggestion chips (src/components/suggestion-chips.ts):**
   - Horizontal scrollable row of pill-shaped buttons
   - Shown below greeting message when no user messages yet
   - Click → populate composer → auto-send
   - Hide after first user message

8. **Typing indicator (src/components/typing-indicator.ts):**
   - Three bouncing dots animation
   - Shown in message list as bot "message" during streaming
   - Replaced by actual message content when stream completes

9. **Event bus (src/core/event-bus.ts):**
   - Simple pub/sub for internal communication between components
   - Events: 'message:send', 'message:receive', 'panel:open', 'panel:close', 'stream:start', 'stream:end'
   - No external event library — vanilla implementation

Wire components together:
- Launcher click → opens/closes panel
- Composer send → adds user bubble to message list → shows typing indicator → (mock) adds bot bubble after 1s delay
- Suggestion chip click → same as composer send
- Populate with mock greeting, mock suggestions, mock bot responses

Deliverables:
- All 8 components + event bus implemented and rendering in shadow DOM
- Mock chat flow working end-to-end in test-page.html
- Components follow widget-design-system.md specs exactly

Constraints:
- All DOM manipulation via vanilla TS (createElement, appendChild, etc.)
- No innerHTML for user content (XSS risk) — use textContent + createElement
- innerHTML OK for static template strings (widget chrome, icons)
- Each component in its own file, <200 lines
- All styling via the shared Constructable Stylesheets from W2.1
```

### Prompt W2.3 — Code review + QA scaffold

```text
Activate code-reviewer agent, then Evidence Collector mode (sequentially).

**Step 1 — Code review:**
Review /smartbot-widget code for:
- Shadow DOM correctness (no style leaks, no global DOM pollution)
- Constructable Stylesheet usage (no <style> tags, no inline styles)
- CSP compatibility (no eval, no dynamic script injection)
- XSS prevention (no innerHTML with user content)
- Bundle sanity (no accidental large dependencies)
- Component isolation (each component self-contained)
- Event bus usage (no direct cross-component coupling)

**Step 2 — Visual QA:**
1. Run `cd smartbot-widget && npm run dev`
2. Open test-page.html in browser
3. Test: launcher click, panel open/close, mock chat flow, suggestion chips, mobile resize
4. Collect screenshots
5. Compare against docs/widget-design-system.md and Figma frames (use Figma MCP)
6. Report issues with severity: CRITICAL / HIGH / MEDIUM / LOW
7. Verify style isolation: host page styles must NOT leak into widget

Output:
Create docs/qa-widget-scaffold.md with code review findings + visual QA results.
Minimum 5 concrete issues.
```

### Prompt W2.4 — Fix scaffold issues

```text
Activate Frontend Developer mode.

Read: docs/qa-widget-scaffold.md

Task:
Fix all CRITICAL and HIGH issues from the scaffold QA report.
Address MEDIUM issues where feasible.

Constraints:
- Preserve Shadow DOM isolation architecture
- Preserve Constructable Stylesheet approach
- Do not add external dependencies
- Do not exceed 200 lines per component file

Output:
Update docs/qa-widget-scaffold.md with resolution summary per issue.
```

---

## Phase W3 — Backend integration + streaming + theming

Goal: connect widget to real backend APIs, implement SSE chat streaming, session persistence, theming engine, and all 3 embed modes.

### Prompt W3.1 — Backend integration + SSE streaming

```text
Activate Frontend Developer mode.

Read first:
- docs/widget-architecture.md
- docs/widget-build-plan.md
- docs/backend-api-reference.md
- docs/figma-screen-spec.md (Section I)

Task:
Connect /smartbot-widget to real backend APIs. Replace all mock data with live integration.

Implementation:

1. **Config loader (src/api/config-loader.ts):**
   - `GET /api/v1/chat/:botId/config` → load bot name, avatar, greeting, suggestions, widget config
   - Called once on init, cached in memory
   - Error handling: show generic greeting if config fails, log warning

2. **API client (src/api/client.ts):**
   - Thin fetch wrapper with base URL config
   - Default headers: `Authorization: Bearer <bot-api-key>`, `Content-Type: application/json`
   - Bot API key from `data-bot-id` attribute → used as Bearer token
   - Request timeout (30s for chat, 10s for config)
   - No retry on 4xx, retry 1x on 5xx with 2s delay

3. **SSE streaming via fetch + ReadableStream (src/api/sse-reader.ts):**
   - `POST /api/v1/chat/:botId/messages` with body: `{ conversationId, content, endUserMetadata }`
   - Read response as `ReadableStream` via `response.body.getReader()`
   - Parse SSE format: split by `\n\n`, extract `data:` field from each event
   - Handle event types: `message` (text chunk), `done` (stream complete), `error`
   - Accumulate chunks into message bubble progressively (character-by-character reveal)
   - On stream complete: finalize message, re-enable composer
   - On error mid-stream: show error inline in message bubble, enable retry

4. **Reconnection (src/api/sse-reader.ts):**
   - On network error: exponential backoff (1s → 2s → 4s → 8s → 16s → max 30s)
   - Show reconnecting indicator in message list
   - Resume conversation on reconnect (conversationId preserved)
   - Max 5 retries before showing "Connection lost" with manual retry button

5. **Session persistence (src/utils/storage.ts):**
   - Save to localStorage: `smartbot_{botId}_conversationId`, `smartbot_{botId}_endUserId`
   - Generate endUserId on first visit (crypto.randomUUID() or fallback)
   - On init: check localStorage → if conversationId exists, load history:
     `GET /api/v1/chat/:botId/conversations/:conversationId/messages`
   - Clear session on `SmartbotWidget.reset()`

6. **Wire into existing components:**
   - Config loader → populate header (bot name, avatar), greeting, suggestion chips
   - Composer send → call SSE endpoint → stream response into message bubble
   - Typing indicator → shown during stream, replaced by final message on `done`

Deliverables:
- Widget fully connected to backend APIs
- SSE streaming chat working end-to-end
- Session persistence with returning user history
- Reconnection with exponential backoff
- No mock data remaining

Constraints:
- Zero external dependencies (no axios, no eventsource-polyfill)
- fetch + ReadableStream only (no EventSource — we need POST body)
- All network errors must surface in UI (no silent failures)
- Rate limit: max 1 concurrent chat request per widget instance
```

### Prompt W3.2 — Theming engine + embed modes + public API

```text
Activate Frontend Developer mode.

Read first:
- docs/widget-architecture.md
- docs/widget-design-system.md
- docs/figma-screen-spec.md (Section C4 — Widget config, Section I — Widget)

Task:
Implement runtime theming, all 3 embed modes, and finalize the public JavaScript API.

Implementation:

1. **Theming engine (src/core/theme-manager.ts):**
   - Read theme config from: data attributes → API config → defaults (in priority order)
   - Apply via CSS custom properties on the shadow host element:
     ```
     --smartbot-primary-color, --smartbot-primary-hover
     --smartbot-bg, --smartbot-surface, --smartbot-border
     --smartbot-text, --smartbot-text-secondary
     --smartbot-user-bubble-bg, --smartbot-user-bubble-text
     --smartbot-bot-bubble-bg, --smartbot-bot-bubble-text
     --smartbot-font-family
     ```
   - Light/dark mode:
     - Auto-detect via `window.matchMedia('(prefers-color-scheme: dark')`
     - Override via `data-theme="light|dark|auto"` attribute
     - Switch token sets on `:host` when mode changes
   - Primary color derivation: from single `data-primary-color` → generate hover, light, foreground variants using HSL math (no external color lib)
   - `updateTheme(partial)` method for runtime changes without re-init

2. **Branding toggle:**
   - "Powered by Smartbot" footer in panel, below composer
   - Controlled by `data-show-powered-by="true|false"` or API config `showPoweredBy`
   - Hidden for Advanced+ plan users (read from config API response)

3. **3 embed modes (src/core/widget-api.ts):**

   **Bubble mode (default):**
   - Auto-init from `<script defer src="..." data-bot-id="xxx">`
   - Creates fixed-position container at bottom-right/left of viewport
   - Launcher visible → click opens panel above it
   - Position configurable: `data-position="bottom-right|bottom-left"`

   **Inline/container mode:**
   - `SmartbotWidget.init({ botId, mode: 'inline' }, '#my-container')`
   - No launcher — panel renders directly inside the specified container
   - Panel height fills container (no fixed max-height)
   - No position/floating behavior

   **Direct link mode:**
   - Standalone HTML page served at `/widget/:botId` (by smartbot-web or static host)
   - Full-viewport panel, no launcher
   - URL params for config overrides: `?theme=dark&primaryColor=%236D28D9`
   - This page loads the same IIFE script with inline mode targeting `<body>`

4. **Public API finalization (src/core/widget-api.ts):**
   ```typescript
   SmartbotWidget.init(config: WidgetConfig, container?: string): void
   SmartbotWidget.open(): void        // bubble mode only
   SmartbotWidget.close(): void       // bubble mode only
   SmartbotWidget.toggle(): void      // bubble mode only
   SmartbotWidget.reset(): void       // clear session, reload greeting
   SmartbotWidget.destroy(): void     // remove shadow root + container from DOM
   SmartbotWidget.updateTheme(theme: Partial<ThemeConfig>): void
   ```
   - All methods are no-ops before init (warn to console)
   - `destroy()` removes all DOM, event listeners, intervals
   - Multiple instances: `init()` with different containers creates separate instances

5. **Direct link page (smartbot-widget/public/direct-link.html or smartbot-web route):**
   - Minimal HTML: `<script>` + `<div id="widget-root" style="height:100vh">`
   - Reads botId from URL path, config from URL params
   - Calls `SmartbotWidget.init({ botId, mode: 'inline' }, '#widget-root')`

Deliverables:
- Theming engine with CSS custom properties, light/dark mode, primary color derivation
- All 3 embed modes working
- Public JS API complete
- Branding toggle implemented
- Updated test-page.html with all 3 modes demonstrated
- Updated README with embed mode documentation

Constraints:
- No external color library — HSL math for color derivation (keep it simple: 3-4 derived colors)
- Theme changes must not cause FOUC (flash of unstyled content)
- Inline mode must not break if container is resized
```

### Prompt W3.3 — Code review + QA integration

```text
Activate code-reviewer agent, then Evidence Collector mode (sequentially).

**Step 1 — Code review:**
Review /smartbot-widget integration code for:
- SSE streaming correctness (parse format, handle partial chunks, error recovery)
- Session persistence logic (localStorage key naming, cleanup, corruption handling)
- Theming engine (CSS variable application, dark mode detection, no FOUC)
- 3 embed modes (bubble/inline/direct — each initializes correctly)
- Public API robustness (guard against pre-init calls, double-init, destroy+re-init)
- Security: no user content in innerHTML, no eval, CSP-safe
- Network error handling (timeouts, retries, UI feedback)
- Memory leaks (event listeners cleaned up on destroy, intervals cleared)

**Step 2 — Visual + functional QA:**
1. Run widget locally, connect to backend (or mock API if backend unavailable)
2. Test all 3 embed modes in test-page.html
3. Test SSE streaming: send message → verify progressive text reveal
4. Test theme switching: change data-primary-color → verify all elements update
5. Test dark mode: auto + manual override
6. Test session persistence: send messages → refresh page → verify history loads
7. Test error handling: kill backend mid-stream → verify error UI + retry
8. Test mobile: resize to <480px → verify fullscreen overlay
9. Collect screenshots for each test case
10. Compare against Figma (use Figma MCP)

Output:
Create docs/qa-widget-integration.md with code review + QA results.
Minimum 5 concrete issues with severity.
```

### Prompt W3.4 — Fix integration issues

```text
Activate Frontend Developer mode.

Read: docs/qa-widget-integration.md

Task:
Fix all CRITICAL and HIGH issues from the integration QA report.
Address MEDIUM issues where feasible.

Constraints:
- Preserve Shadow DOM + Constructable Stylesheet architecture
- Preserve SSE streaming approach (fetch + ReadableStream)
- Preserve public API contract (no breaking changes)
- Zero external dependencies

Output:
Update docs/qa-widget-integration.md with resolution summary per issue.
```

---

## Phase W4 — Hardening + quality gate

Goal: production-ready widget with error resilience, accessibility, security hardening, build optimization.

### Prompt W4.1 — Production hardening

```text
Activate Frontend Developer mode.

Read first:
- docs/widget-architecture.md
- docs/widget-design-system.md
- docs/qa-widget-integration.md
- plans/reports/researcher-widget-embedding-best-practices.md (Section 8 — security + performance checklists)

Task:
Harden /smartbot-widget for production deployment.

Scope:

1. **Error states (all inline, never modal/alert):**
   - Config load failure → generic greeting, "Unable to load bot config" subtle banner
   - Network error → "Kết nối bị gián đoạn" inline bar + retry button
   - Stream error → error text in message bubble + "Thử lại" button
   - Rate limited (429) → "Vui lòng chờ..." with countdown
   - Bot not found (404) → "Bot không tồn tại" static message

2. **Accessibility (WCAG 2.1 AA inside shadow DOM):**
   - `role="log"` + `aria-live="polite"` on message list container
   - Focus trap: Tab cycles within open panel, Escape closes panel
   - Return focus to launcher on panel close
   - All interactive elements have accessible names (aria-label)
   - Send button: aria-label="Gửi tin nhắn"
   - Close button: aria-label="Đóng"
   - Keyboard-only usable: Tab → elements, Enter → activate, Escape → close
   - Screen reader: announce new messages via aria-live region
   - Minimum touch target: 44x44px for mobile interactive elements
   - Color contrast: verify primary color meets 4.5:1 ratio (warn in console if not)

3. **Security hardening:**
   - Sanitize all bot/API content before rendering (strip <script>, event handlers)
   - Use textContent for user-generated text, createElement for structure
   - No innerHTML with dynamic content (static templates only)
   - Validate config API response shape before using
   - Rate limit outgoing messages: max 1 per second (debounce rapid sends)
   - Validate data attributes on init (botId format, color format)

4. **Build optimization:**
   - Run `npx vite build` → verify single IIFE output
   - Check bundle size: must be <60 KB gzip
   - If over budget: identify heaviest modules, refactor or lazy-load
   - Content-hash filename for cache-busting
   - Source map generation (separate file, not inline)
   - Tree-shaking verification: no dead code in output

5. **Performance:**
   - Lazy-load panel content (only render when first opened)
   - Debounce resize events (100ms) for responsive checks
   - Limit message list DOM nodes (virtualize if >200 messages, or cap at 100 visible)
   - Image/avatar lazy loading for bot avatars

Deliverables:
- All error states implemented with inline UI patterns
- Full keyboard accessibility + ARIA attributes
- Security hardening applied
- Build optimized and size-verified
- Performance optimizations in place

Constraints:
- No external accessibility or sanitization libraries (keep deps at zero)
- If DOMPurify-like sanitization needed, implement minimal inline version (<50 lines)
- All changes must preserve existing Shadow DOM + Constructable Stylesheet architecture
```

### Prompt W4.2 — Widget reality check

```text
Activate Reality Checker mode.

Task:
Assess production readiness of /smartbot-widget.

Read:
- docs/widget-architecture.md
- docs/widget-build-plan.md
- docs/widget-design-system.md
- docs/backend-api-reference.md
- docs/qa-widget-scaffold.md
- docs/qa-widget-integration.md

Use Figma MCP to verify widget screens.

Assess:
1. **Embeddability:** Does the widget work on a plain HTML page with hostile CSS? Does Shadow DOM actually prevent style leaks?
2. **Bundle:** Is the IIFE output <60 KB gzip? Are there any surprise dependencies?
3. **Streaming:** Does SSE work reliably? Does reconnection recover gracefully?
4. **Theming:** Does changing primary color update all elements? Does dark mode work?
5. **Embed modes:** Do bubble, inline, and direct-link all initialize correctly?
6. **Accessibility:** Can you Tab through the widget? Does Escape close it? Are ARIA attributes present?
7. **Security:** Is user content sanitized? No innerHTML with dynamic data? CSP-compatible?
8. **Mobile:** Does <480px trigger fullscreen? Are touch targets ≥44px?
9. **Session:** Does conversation persist across page reloads? Does reset clear it?
10. **Visual quality:** Does the widget match Figma spec? Are animations smooth?

Output:
Create docs/widget-reality-check.md with:
- Score per category (1-5)
- Concrete evidence for each score
- Overall verdict: FAILED / NEEDS WORK / READY
- If NEEDS WORK: prioritized list of must-fix items before launch
```

---

# 8. Integration phase — platform ↔ widget

## Mục tiêu

Đảm bảo:
- Platform widget config pages (C4) map đúng sang widget CSS custom properties
- Preview trong C4 phản ánh đúng widget behavior (load actual widget in iframe or shadow DOM preview)
- Embed code generator (C5) produces correct `<script>` tags with matching data attributes
- Theming fields platform lưu → API config endpoint trả → widget đọc được
- Public config API contract (`GET /api/v1/chat/:botId/config`) ổn định

## Prompt I1.1 — Platform ↔ widget integration

```text
Activate Frontend Developer mode.

Read first:
- docs/frontend-architecture.md
- docs/frontend-design-system.md
- docs/widget-architecture.md
- docs/widget-design-system.md
- docs/backend-api-reference.md

Use Figma MCP to inspect:
- C4 (Widget config page in platform)
- C5 (API Key & Embed page)
- I1 (Widget itself)

Task:
Align /smartbot-web and /smartbot-widget for end-to-end integration.

Deliverables:

1. **C4 Widget config → Widget runtime mapping:**
   - Platform saves: theme, primaryColor, position, bubbleIcon, showPoweredBy, headerText, customCss
   - Backend stores in Bot.widgetConfig JSON column
   - Config API serves: `GET /api/v1/chat/:botId/config` → widget reads these fields
   - Verify: every config field in platform UI has a corresponding widget behavior
   - Fix any mismatches (field name, format, missing support)

2. **C4 Live preview:**
   - Embed actual widget in preview panel (load IIFE in shadow DOM or iframe)
   - Preview updates in realtime as user changes config fields
   - Pass config changes to preview widget via `SmartbotWidget.updateTheme()` or re-init
   - No fake/mock preview — show real widget behavior

3. **C5 Embed code generator:**
   - Generate correct `<script>` tag with all relevant data attributes
   - 3 variants: bubble script tag, inline div + script, direct link URL
   - Copy button for each variant
   - Embed URL should point to CDN or platform-hosted widget script
   - Direct link URL: `{platform_url}/widget/{botId}`

4. **Direct link route in smartbot-web:**
   - Add route: `/widget/[botId]/page.tsx` in smartbot-web (public, no auth)
   - Minimal page: loads widget IIFE in inline mode, full viewport
   - Reads botId from URL params
   - No admin chrome (no sidebar, no header)

5. **Document integration contract:**
   Create docs/platform-widget-integration.md with:
   - Config field mapping table (platform field → API field → widget CSS property)
   - Embed code templates (exact HTML for each mode)
   - Preview implementation approach
   - Assumptions and known limitations

Constraints:
- Do not duplicate widget rendering logic in platform — load the real widget for preview
- Preserve separation: admin app uses React/Next.js, widget uses vanilla TS
- Direct link page should be lightweight (no heavy Next.js bundle)
```

## Prompt I1.2 — Integration QA + final release gate

```text
Activate Evidence Collector mode, then Reality Checker mode (sequentially).

**Step 1 — Integration QA (Evidence Collector):**
1. Open platform → Bot detail → Widget tab (C4)
2. Change theme config (color, dark mode, position, branding)
3. Verify preview widget updates in realtime
4. Save config → open widget on external test page → verify config applied
5. Go to API & Embed tab (C5) → copy each embed code variant
6. Paste each variant into test HTML pages → verify they work
7. Test direct link URL → verify full-page widget loads
8. Collect screenshot evidence for each test
9. Compare platform config surface vs widget capabilities → identify gaps

Output: Create docs/qa-platform-widget-integration.md

**Step 2 — Final release gate (Reality Checker):**
Read:
- docs/frontend-reality-check.md (if exists)
- docs/widget-reality-check.md
- docs/platform-widget-integration.md
- docs/qa-platform-widget-integration.md
- All QA docs from platform and widget phases

Assess:
- Platform completion status vs Figma spec
- Widget production readiness (bundle size, isolation, streaming, accessibility)
- Integration coherence (config → preview → embed → runtime)
- Top launch blockers
- Post-launch risk list

Output: Create docs/final-frontend-release-gate.md with:
- Platform verdict (FAILED / NEEDS WORK / READY)
- Widget verdict (FAILED / NEEDS WORK / READY)
- Integration verdict (FAILED / NEEDS WORK / READY)
- Combined final verdict
- Must-fix items before launch (if any)

---

# 9. Daily operating rhythm

## Day 1
- cài agents
- cài Figma MCP
- thêm `CLAUDE.md`
- chạy P1.1
- chạy P1.2

## Day 2
- chạy P2.1
- chạy P2.2
- chạy P2.3

## Day 3
- build Auth + Onboarding
- QA Auth + fix
- build Dashboard
- QA Dashboard + fix

## Day 4–5
- build Bots
- QA Bots + fix

## Day 6–7
- build Knowledge Bases + Documents
- QA KB + fix

## Day 8
- Reality check nửa đầu platform nếu muốn

## Day 9–10
- build Conversations
- QA Conversations + fix
- build Analytics
- QA Analytics + fix

## Day 11
- build Billing
- QA Billing + fix
- build Settings
- QA Settings + fix

## Day 12
- platform reality check

## Day 13 — Widget architecture + design system + scaffold
- chạy W1.1 (UX Architect — architecture decisions)
- chạy W1.2 (UI Designer — widget design system)
- chạy W2.1 (scaffold Vite + Shadow DOM host)
- chạy W2.2 (build UI components + mock chat flow)

## Day 14 — Widget scaffold QA + backend integration
- chạy W2.3 (code review + QA scaffold)
- chạy W2.4 (fix scaffold issues)
- chạy W3.1 (backend integration + SSE streaming)
- chạy W3.2 (theming engine + embed modes + public API)

## Day 15 — Widget integration QA + hardening
- chạy W3.3 (code review + QA integration)
- chạy W3.4 (fix integration issues)
- chạy W4.1 (production hardening — error states, a11y, security, build, perf)
- chạy W4.2 (widget reality check)

## Day 16 — Platform ↔ widget integration + final gate
- chạy I1.1 (C4 config mapping, live preview, C5 embed codes, direct link route)
- chạy I1.2 (integration QA + final release gate)

---

# 10. Nguyên tắc vận hành quan trọng

## 10.1. Luôn bắt Claude đọc docs trước
Ít nhất:
- `docs/backend-api-reference.md`
- `docs/figma-screen-spec.md`
- docs kiến trúc / design system tương ứng

## 10.2. Luôn nhắc “use Figma MCP”
Không giả định Claude tự nhớ.

## 10.3. Không giao task quá to
Không dùng:
- “build toàn bộ frontend”

Luôn dùng:
- “implement [module] using existing architecture and Figma MCP”

## 10.4. Không cho agent đổi kiến trúc giữa chừng
Luôn thêm:
- “preserve existing architecture and shared patterns”

## 10.5. Sau mỗi module phải có QA artifact
Nếu không có QA docs, rất dễ ảo tưởng đã xong.

## 10.6. Widget không được lẫn vào dashboard
Không share bừa component lớn.
Chỉ share lõi nhỏ:
- tokens
- icons
- api types
- helper nhỏ

---

# 11. Checklist ngắn để bắt đầu ngay

## Setup
- [ ] cài `agency-agents`
- [ ] cài Figma Remote MCP
- [ ] thêm `CLAUDE.md`
- [ ] tạo `smartbot-web/`
- [ ] tạo `smartbot-widget/` (Vite + Vanilla TS, separate from Next.js)

## Platform foundation
- [ ] chạy prompt P1.1
- [ ] chạy prompt P1.2
- [ ] chạy prompt P2.1
- [ ] chạy prompt P2.2
- [ ] chạy prompt P2.3

## Platform modules
- [ ] Auth + onboarding
- [ ] Dashboard
- [ ] Bots
- [ ] Knowledge Bases + Documents
- [ ] Conversations
- [ ] Analytics
- [ ] Billing
- [ ] Settings
- [ ] Platform reality check

## Widget — Phase W1: Architecture + design system
- [ ] W1.1 — UX Architect: architecture decisions (Shadow DOM, Vite IIFE, CSS vars, fetch+SSE)
- [ ] W1.2 — UI Designer: widget design system (Constructable Stylesheets, visual specs)

## Widget — Phase W2: Scaffold + components
- [ ] W2.1 — Scaffold Vite project + Shadow DOM host
- [ ] W2.2 — Build UI components (8 components + event bus + mock chat)
- [ ] W2.3 — Code review + QA scaffold
- [ ] W2.4 — Fix scaffold issues

## Widget — Phase W3: Backend integration + theming + embed modes
- [ ] W3.1 — Backend integration + SSE streaming (config loader, API client, fetch+ReadableStream)
- [ ] W3.2 — Theming engine + 3 embed modes + public JS API
- [ ] W3.3 — Code review + QA integration
- [ ] W3.4 — Fix integration issues

## Widget — Phase W4: Hardening + quality gate
- [ ] W4.1 — Production hardening (error states, a11y, security, build <60KB, perf)
- [ ] W4.2 — Widget reality check (10-point assessment)

## Platform ↔ widget integration
- [ ] I1.1 — Config mapping (C4), live preview, embed code generator (C5), direct link route
- [ ] I1.2 — Integration QA + final release gate

---

# 12. Final recommendation

Tóm lại, workflow tối ưu cho Smartbot v2 là:

- **Platform**: build from scratch theo Figma + backend docs
- **Widget**: tách thành app/package riêng trong cùng monorepo
- **Claude Code**: dùng như một dàn agent cố định theo pipeline
- **Figma MCP**: bắt buộc dùng ở mọi phase liên quan UI thật
- **QA docs + reality gates**: bắt buộc để tránh “agent tự thấy ổn”

Nếu bám đúng workflow này, anh/chị sẽ giảm đáng kể việc micromanage, nhưng vẫn giữ được:
- consistency
- khả năng scale nhiều màn
- sự tách bạch giữa admin platform và widget nhúng
- chất lượng đủ gần production thay vì demo-only
