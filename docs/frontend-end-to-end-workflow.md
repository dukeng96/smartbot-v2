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
  smartbot-web/            # admin SaaS frontend
  smartbot-widget/         # embeddable chat widget
  packages/
    api-types/             # shared API/generated types
    ui-core/               # tiny shared tokens/icons only
    widget-sdk/            # embed loader/init contract
```

## 0.3. Vì sao tách widget riêng?

Widget nhúng có đặc thù rất khác platform:

- chạy trên website bên thứ ba
- cần CSS/JS isolation
- bundle nhẹ
- auth/public token riêng
- domain validation
- SSE streaming
- backward compatibility cho snippet nhúng

=> **Nên tách widget thành app/package riêng trong cùng monorepo**, chưa cần repo riêng ngay.

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

Widget gồm:
- launcher bubble
- open/close panel
- greeting
- suggestions
- composer
- streaming chat
- session persistence
- theming
- header text
- branding toggle
- public embed script/init

Không coi widget là một page bên trong platform.

---

## Phase W1 — Widget architecture docs

### Prompt W1.1 — UX Architect for widget

```text
Activate UX Architect mode.

Context:
- Smartbot has a separate embeddable chat widget for third-party websites.
- The admin platform and widget should be separate frontend applications/packages.
- Backend APIs already exist for widget config and streaming chat.

Read first:
- docs/backend-api-reference.md
- docs/figma-screen-spec.md
- docs/system-architecture.md
- docs/code-standards.md

Use Figma MCP to inspect the widget-related frames.

Task:
Design the frontend architecture for /smartbot-widget.

Deliverables:
1. Create docs/widget-architecture.md
2. Create docs/widget-build-plan.md

Include:
- whether to use a separate app/package
- rendering/isolation strategy
- embedding strategy
- theming model
- public initialization contract
- session/state strategy
- API integration strategy
- recommended folder structure
- build phases

Constraints:
- Optimize for embeddability, low conflict risk, and maintainability
- Do not assume the host website is React
- Prefer isolation and reliability over cleverness
```

### Prompt W1.2 — UI Designer for widget

```text
Activate UI Designer mode.

Context:
- The embeddable widget is separate from the admin platform.
- Widget-related Figma frames already exist.

Read first:
- docs/widget-architecture.md
- docs/figma-screen-spec.md

Use Figma MCP to inspect the widget-related frames.

Task:
Create an implementation-oriented design system for the widget only.

Deliverables:
1. Create docs/widget-design-system.md
2. Define:
   - launcher
   - panel shell
   - header
   - messages
   - composer
   - suggestion chips
   - loading/streaming/error states
   - theme options
   - mobile / narrow width behavior
3. Identify what should remain independent from the admin platform UI
4. Flag any widget Figma inconsistencies before coding

Constraints:
- Keep the widget lightweight and focused
- Be implementation-oriented
- Do not over-share dashboard UI patterns into the widget
```

---

## Phase W2 — Widget scaffold & MVP

### Prompt W2.1 — Frontend Developer scaffold widget

```text
Activate Frontend Developer mode.

Read first:
- docs/widget-architecture.md
- docs/widget-build-plan.md
- docs/widget-design-system.md
- docs/backend-api-reference.md
- docs/figma-screen-spec.md

Use Figma MCP to inspect the widget-related frames before implementation.

Task:
Initialize /smartbot-widget as a standalone embeddable widget project.

Deliverables:
1. Scaffold the widget app/package
2. Implement:
   - widget shell
   - launcher bubble
   - open/close panel
   - header
   - message area
   - composer
   - suggestion chips
   - mock chat flow first
   - isolated styling setup
   - public initialization API
3. Add README with local development and embed usage instructions

Constraints:
- This widget must run on arbitrary third-party websites
- Keep the bundle small
- Do not assume the host app is React
- Prepare for strong CSS/JS isolation
```

### Prompt W2.2 — Evidence Collector review widget MVP

```text
Activate Evidence Collector mode.

Task:
Review the widget MVP in /smartbot-widget.

Instructions:
1. Run the widget locally
2. Test the launcher and chat panel flows
3. Collect screenshot evidence
4. Compare against:
   - docs/widget-design-system.md
   - docs/figma-screen-spec.md
   - relevant Figma MCP frames
5. Report:
   - visual mismatches
   - interaction problems
   - small-width/mobile issues
   - at least 5 concrete issues with severity

Output:
Create docs/qa-widget-mvp.md
```

### Prompt W2.3 — Frontend Developer fix widget MVP

```text
Activate Frontend Developer mode.

Read:
- docs/qa-widget-mvp.md

Task:
Fix all critical and medium issues from the widget MVP QA report.
Preserve the widget architecture and isolation strategy.

Output:
Update docs/qa-widget-mvp.md with a short resolution summary.
```

---

## Phase W3 — Widget production hardening

### Prompt W3.1 — Frontend Developer harden widget

```text
Activate Frontend Developer mode.

Read first:
- docs/widget-architecture.md
- docs/widget-build-plan.md
- docs/widget-design-system.md
- docs/backend-api-reference.md
- docs/qa-widget-mvp.md

Use Figma MCP to inspect the relevant widget frames.

Task:
Harden /smartbot-widget for production use.

Scope:
- real backend integration for widget config and chat
- streaming chat
- session persistence strategy
- error handling
- theming support
- branding toggle
- embed initialization contract
- host-page conflict reduction
- responsive behavior
- accessibility
- loading/empty/error states

Deliverables:
1. Implement real widget integrations
2. Refine the public embed/init API
3. Update README with integration examples
4. Update docs/widget-implementation-log.md

Constraints:
- Optimize for embeddability and reliability
- Preserve lightweight design
- Do not import unnecessary dashboard dependencies
```

### Prompt W3.2 — Evidence Collector hardening review

```text
Activate Evidence Collector mode.

Task:
Review the production-hardened widget in /smartbot-widget.

Instructions:
1. Run the widget locally
2. Test it in multiple container pages if possible
3. Collect screenshot evidence
4. Check:
   - visual consistency with Figma
   - interaction quality
   - loading/streaming behavior
   - narrow-width behavior
   - obvious host-page conflict risk
5. Report at least 5 concrete issues with severity

Output:
Create docs/qa-widget-hardening.md
```

### Prompt W3.3 — Frontend Developer fix widget hardening issues

```text
Activate Frontend Developer mode.

Read:
- docs/qa-widget-hardening.md

Task:
Fix all critical and medium issues from the widget hardening QA report.
Preserve architecture and public embed contract.

Output:
Update docs/qa-widget-hardening.md with a short resolution summary.
```

---

## Phase W4 — Widget quality gate

### Prompt W4.1 — Widget reality check

```text
Activate Reality Checker mode.

Task:
Assess the production readiness of /smartbot-widget.

Read:
- docs/widget-architecture.md
- docs/widget-build-plan.md
- docs/widget-design-system.md
- docs/backend-api-reference.md
- docs/widget-implementation-log.md
- docs/qa-widget-mvp.md
- docs/qa-widget-hardening.md

Use Figma MCP where useful to verify widget screens.

Output:
Create docs/widget-reality-check.md with:
- overall quality rating
- embeddability assessment
- consistency assessment
- biggest missing pieces
- risks before launch
- honest verdict: FAILED / NEEDS WORK / READY
```

---

# 8. Integration phase — platform + widget

## Mục tiêu
Đảm bảo:

- platform widget config pages map đúng sang widget capabilities
- preview trong platform phản ánh đúng widget behavior
- embed code/generator flow hoạt động đúng
- theming fields của platform tương thích widget thật
- public config API contract ổn định

## Prompt I1.1 — Frontend Developer integration pass

```text
Activate Frontend Developer mode.

Read first:
- docs/frontend-architecture.md
- docs/frontend-design-system.md
- docs/widget-architecture.md
- docs/widget-design-system.md
- docs/backend-api-reference.md
- docs/frontend-implementation-log.md
- docs/widget-implementation-log.md

Use Figma MCP to inspect:
- widget config frames in the platform
- actual widget frames

Task:
Align /smartbot-web and /smartbot-widget for end-to-end integration.

Deliverables:
1. Ensure platform widget configuration pages map correctly to widget runtime behavior
2. Ensure preview states in the platform reflect the actual widget capabilities
3. Ensure embed code generation UX is coherent
4. Document remaining integration assumptions in docs/platform-widget-integration.md

Constraints:
- Do not duplicate widget runtime logic inside the platform
- Preserve the separation between admin app and widget app
```

## Prompt I1.2 — Evidence Collector integration review

```text
Activate Evidence Collector mode.

Task:
Review the end-to-end integration between /smartbot-web and /smartbot-widget.

Instructions:
1. Review widget configuration pages in the platform
2. Review the actual widget behavior
3. Compare configuration surface against runtime behavior
4. Collect screenshot evidence
5. Identify mismatches in:
   - theming
   - branding toggle
   - preview accuracy
   - embed UX
   - config field coverage

Output:
Create docs/qa-platform-widget-integration.md
```

## Prompt I1.3 — Reality Checker final release gate

```text
Activate Reality Checker mode.

Task:
Perform a final release-readiness review for the Smartbot frontend stack:
- /smartbot-web
- /smartbot-widget

Read:
- docs/frontend-reality-check.md
- docs/widget-reality-check.md
- docs/platform-widget-integration.md
- docs/qa-platform-widget-integration.md
- key implementation logs and QA docs

Output:
Create docs/final-frontend-release-gate.md with:
- platform verdict
- widget verdict
- integration verdict
- top launch blockers
- post-launch risk list
- honest final verdict: FAILED / NEEDS WORK / READY
```

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

## Day 13
- chạy W1.1
- chạy W1.2

## Day 14
- chạy W2.1
- chạy W2.2
- chạy W2.3

## Day 15
- chạy W3.1
- chạy W3.2
- chạy W3.3

## Day 16
- widget reality check
- integration pass
- final release gate

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
- [ ] tạo `smartbot-widget/`
- [ ] tạo `packages/api-types/`
- [ ] tạo `packages/ui-core/`
- [ ] tạo `packages/widget-sdk/`

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

## Widget
- [ ] W1.1
- [ ] W1.2
- [ ] W2.1
- [ ] W2.2
- [ ] W2.3
- [ ] W3.1
- [ ] W3.2
- [ ] W3.3
- [ ] Widget reality check

## Integration
- [ ] integration pass
- [ ] integration QA
- [ ] final release gate

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
