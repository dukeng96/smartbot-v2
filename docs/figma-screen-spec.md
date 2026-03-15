# Figma Screen Spec — GenAI Assistant Platform

> Tài liệu tổng hợp toàn bộ màn hình cần thiết kế, map 1:1 với API routes + data models backend đã xây.
> Chỉ mô tả feature/data — team design tự quyết định UI/UX.

---

## Tổng quan

- **Tổng số màn hình:** 25 màn chính + 1 embed widget + các modal/dialog phụ
- **Kiến trúc:** SaaS multi-tenant, mỗi user thuộc 1+ workspace (tenant)
- **Auth:** JWT, hỗ trợ email + Google OAuth
- **Phân quyền:** owner > admin > member > viewer (trong mỗi tenant)

---

## A. Public Pages (Không cần đăng nhập)

### A1. Trang Đăng ký (Register)

**API:** `POST /api/v1/auth/register`

**Chức năng:**
- Form nhập: email, password, fullName
- Nút đăng ký bằng Google (OAuth)
- Sau đăng ký: tự động tạo workspace (tenant) mặc định cho user
- Tự động gán plan Free + khởi tạo credit usage
- Link chuyển sang trang Login

**Dữ liệu gửi:** `{email, password, fullName}`
**Dữ liệu nhận:** `{user, tenant, accessToken, refreshToken}`

---

### A2. Trang Đăng nhập (Login)

**API:** `POST /api/v1/auth/login` · `POST /api/v1/auth/oauth/google`

**Chức năng:**
- Form nhập: email, password
- Nút đăng nhập bằng Google
- Link "Quên mật khẩu" → A3
- Link chuyển sang trang Register

**Dữ liệu nhận:** `{accessToken, refreshToken}`

---

### A3. Quên mật khẩu (Forgot Password)

**API:** `POST /api/v1/auth/forgot-password`

**Chức năng:**
- Form nhập email
- Gửi email chứa link reset (hoặc hiện token trong dev mode)
- Thông báo "Đã gửi email"

---

### A4. Đặt lại mật khẩu (Reset Password)

**API:** `POST /api/v1/auth/reset-password`

**Chức năng:**
- Form nhập: mật khẩu mới, xác nhận mật khẩu
- Token lấy từ URL parameter
- Sau reset thành công → chuyển về Login

---

### A5. Xác minh email (Verify Email)

**API:** `POST /api/v1/auth/verify-email`

**Chức năng:**
- Trang hiện kết quả xác minh (thành công / token hết hạn / lỗi)
- Token lấy từ URL parameter

---

## B. Dashboard & Layout chính (Cần đăng nhập)

### B1. Layout chính (App Shell)

**Chức năng:**
- Sidebar navigation chứa các mục: Dashboard, Bots, Knowledge Bases, Conversations, Analytics, Billing, Settings
- Header: tên user, avatar, tên workspace hiện tại
- Nút logout (`POST /api/v1/auth/logout`)
- Responsive: sidebar collapse trên mobile

---

### B2. Dashboard (Trang chủ sau đăng nhập)

**API:** `GET /api/v1/analytics/overview`

**Chức năng:**
- Hiện các KPI tổng quan:
  - Tổng conversations hôm nay
  - Tổng messages hôm nay
  - Credits đã dùng / còn lại
  - Số bot đang active
  - Tổng documents đã upload
- Có thể thêm quick actions: "Tạo bot mới", "Upload tài liệu"

**Dữ liệu:** `{totalConversationsToday, totalMessagesToday, creditsUsed, creditsRemaining, activeBots, totalDocuments}`

---

## C. Quản lý Bot

### C1. Danh sách Bot

**API:** `GET /api/v1/bots` (paginated, filter by status)

**Chức năng:**
- Liệt kê các bot của tenant, phân trang
- Mỗi bot hiện: name, description, status (draft/active/paused/archived), số KB gắn, số channels
- Bộ lọc theo status
- Nút "Tạo bot mới" (kiểm tra quota: nếu đạt giới hạn plan → hiện thông báo upgrade)
- Actions mỗi bot: Xem chi tiết, Duplicate, Xóa (soft delete)

**Data model Bot:** `{id, name, description, avatarUrl, status, topK, memoryTurns, currentKnowledgeChars, createdAt}`

---

### C2. Chi tiết Bot — Tab Cấu hình chung

**API:** `GET /api/v1/bots/:id` · `PATCH /api/v1/bots/:id`

**Chức năng:**
- Xem + chỉnh sửa: name, description, avatarUrl, status
- Cấu hình RAG: topK (1-20), memoryTurns (1-20)
- Hiện thống kê: currentKnowledgeChars, maxKnowledgeChars, số conversations, số channels
- Nút xóa bot (soft delete, cần xác nhận)
- Nút duplicate bot (`POST /api/v1/bots/:id/duplicate`)

---

### C3. Chi tiết Bot — Tab Personality

**API:** `GET /api/v1/bots/:id/personality` · `PATCH /api/v1/bots/:id/personality`

**Chức năng:**
- Chỉnh sửa các trường:
  - **System Prompt** — textarea lớn, hướng dẫn hành vi bot
  - **Greeting Message** — tin nhắn chào mừng khi user mở chat
  - **Suggested Questions** — danh sách câu hỏi gợi ý (mảng strings, thêm/xóa động)
  - **Fallback Message** — tin nhắn khi bot không trả lời được
  - **Personality** — JSON object: tone, language, restrictions

---

### C4. Chi tiết Bot — Tab Widget

**API:** `PATCH /api/v1/bots/:id/widget` · `GET /api/v1/bots/:id/widget/preview`

**Chức năng:**
- Cấu hình giao diện widget embed:
  - theme (light/dark)
  - primaryColor (color picker)
  - position (bottom-right / bottom-left)
  - bubbleIcon (URL hoặc chọn preset)
  - showPoweredBy (toggle)
  - customCss (textarea, chỉ có ở plan Advanced+)
  - headerText
- Preview widget realtime (render từ API hoặc client-side)

**Widget config data:** `{theme, primaryColor, position, bubbleIcon, showPoweredBy, customCss, headerText}`

---

### C5. Chi tiết Bot — Tab API Key & Embed

**API:** `POST /api/v1/bots/:id/api-key` · `DELETE /api/v1/bots/:id/api-key` · `GET /api/v1/bots/:id/embed-code`

**Chức năng:**
- **API Key:**
  - Hiện trạng thái: đã tạo (hiện prefix `sk-xxx...`) hoặc chưa tạo
  - Nút "Tạo API Key" → hiện key 1 lần duy nhất (cảnh báo không thể xem lại)
  - Nút "Thu hồi API Key" (cần xác nhận)
- **Embed Code:**
  - 3 dạng embed: iframe snippet, bubble snippet, direct link URL
  - Nút copy cho mỗi dạng

**Embed data:** `{iframe, bubble, directLink}`

---

### C6. Chi tiết Bot — Tab Knowledge Bases

**API:** `GET /api/v1/bots/:id/knowledge-bases` · `POST /api/v1/bots/:id/knowledge-bases` · `DELETE /api/v1/bots/:id/knowledge-bases/:kbId`

**Chức năng:**
- Danh sách KB đã gắn vào bot (hiện name, totalDocs, totalChars, priority)
- Nút "Gắn KB" → modal chọn KB từ danh sách KB của tenant, set priority
- Nút gỡ KB khỏi bot (cần xác nhận)
- Drag để sắp xếp priority

---

### C7. Chi tiết Bot — Tab Channels

**API:** `GET /api/v1/bots/:botId/channels` · `POST /api/v1/bots/:botId/channels` · `PATCH /api/v1/bots/:botId/channels/:chId` · `DELETE /api/v1/bots/:botId/channels/:chId`

**Chức năng:**
- Danh sách channels đã kết nối: web_widget, facebook_messenger, telegram, zalo, api
- Mỗi channel hiện: type, status, connectedAt, lastActiveAt
- Nút "Thêm channel" → chọn loại:
  - **Facebook Messenger:** flow kết nối OAuth (stub) (`POST .../facebook/connect`)
  - **Telegram:** nhập bot token
  - **Zalo:** nhập OA config
  - **Web Widget:** tự động có sẵn
  - **API:** cần API key (liên kết tab C5)
- Nút ngắt kết nối channel
- Chỉnh sửa config channel

---

## D. Knowledge Bases

### D1. Danh sách Knowledge Bases

**API:** `GET /api/v1/knowledge-bases` (paginated)

**Chức năng:**
- Liệt kê các KB của tenant
- Mỗi KB hiện: name, description, totalDocuments, totalChars, status (active/processing/error), embeddingModel
- Nút "Tạo KB mới"
- Actions: Xem chi tiết, Xóa (soft delete, cần xác nhận)

**Data model KnowledgeBase:** `{id, name, description, vectorCollection, embeddingModel, chunkSize, chunkOverlap, totalDocuments, totalChars, status}`

---

### D2. Chi tiết Knowledge Base

**API:** `GET /api/v1/knowledge-bases/:id` · `PATCH /api/v1/knowledge-bases/:id`

**Chức năng:**
- Thông tin KB: name, description (editable)
- Cấu hình chunking: chunkSize, chunkOverlap (editable)
- Thống kê: totalDocuments, totalChars, embeddingModel, vectorCollection
- Nút "Reprocess tất cả documents" (`POST /api/v1/knowledge-bases/:id/reprocess-all`)
- Nút xóa KB (cần xác nhận)

---

### D3. Danh sách Documents (trong KB)

**API:** `GET /api/v1/knowledge-bases/:id/documents` (paginated)

**Chức năng:**
- Liệt kê documents thuộc KB
- Mỗi document hiện:
  - originalName (hoặc sourceUrl, hoặc "Text input")
  - sourceType: file_upload / url_crawl / text_input
  - status: pending / processing / completed / error
  - processingStep: extracting / chunking / embedding (khi đang processing)
  - processingProgress: 0-100% (progress bar)
  - charCount, chunkCount
  - enabled (toggle)
  - errorMessage (nếu status = error)
- 3 cách thêm document:
  - **Upload file** (`POST .../documents/upload`) — hỗ trợ multi-file, drag & drop
  - **Nhập URL** (`POST .../documents/url`) — form nhập URL
  - **Nhập text** (`POST .../documents/text`) — textarea nhập nội dung
- Actions mỗi document:
  - Toggle enabled/disabled (`PATCH .../documents/:docId`)
  - Reprocess (`POST .../documents/:docId/reprocess`)
  - Xóa (soft delete, cần xác nhận)
  - Xem chi tiết

**Data model Document:** `{id, sourceType, originalName, mimeType, fileSize, storagePath, sourceUrl, status, processingStep, processingProgress, errorMessage, charCount, chunkCount, enabled, metadata}`

---

### D4. Chi tiết Document

**API:** `GET /api/v1/knowledge-bases/:id/documents/:docId` · `PATCH /api/v1/knowledge-bases/:id/documents/:docId`

**Chức năng:**
- Thông tin chi tiết: originalName, sourceType, mimeType, fileSize, sourceUrl
- Trạng thái processing: status, processingStep, progress, errorMessage
- Thống kê: charCount, chunkCount
- Timestamps: createdAt, processingStartedAt, processingCompletedAt
- Toggle enabled
- Metadata (JSON editor hoặc key-value pairs)
- Nút reprocess, nút xóa

---

## E. Conversations

### E1. Danh sách Conversations

**API:** `GET /api/v1/bots/:botId/conversations` (paginated, filterable)

**Chức năng:**
- Chọn bot (dropdown hoặc tab) để xem conversations
- Bộ lọc: channel (web_widget/facebook/telegram/...), status (active/closed/archived), dateRange
- Mỗi conversation hiện:
  - endUserName hoặc endUserId
  - channel
  - messageCount
  - lastMessageAt
  - status
  - rating (1-5 sao, nếu có)
- Nút tìm kiếm tin nhắn (`GET /api/v1/bots/:botId/messages/search?q=`)
- Nút archive conversation (`DELETE /api/v1/conversations/:convId`)

**Data model Conversation:** `{id, botId, endUserId, endUserName, endUserEmail, endUserMetadata, channel, status, messageCount, lastMessageAt, rating, feedbackText}`

---

### E2. Chi tiết Conversation (Chat thread)

**API:** `GET /api/v1/conversations/:convId` · `GET /api/v1/conversations/:convId/messages`

**Chức năng:**
- Hiện thread chat: danh sách messages phân trang, sắp xếp theo thời gian (ASC)
- Mỗi message hiện:
  - role: user / assistant / system
  - content (text)
  - createdAt (timestamp)
  - feedback: thumbs_up / thumbs_down (nếu có)
  - Thông tin RAG debug (có thể ẩn/hiện): searchQuery, retrievalContext (danh sách chunks retrieved), modelUsed, responseTimeMs
  - Token usage: inputTokens, outputTokens, totalTokens, creditsUsed
- Sidebar/panel thông tin end-user: endUserName, endUserEmail, endUserMetadata, channel
- Đánh rating conversation: 1-5 sao + feedbackText (`POST /api/v1/conversations/:convId/rating`)
- Feedback từng message: thumbs up/down (`POST /api/v1/messages/:msgId/feedback`)

**Data model Message:** `{id, role, content, inputTokens, outputTokens, totalTokens, creditsUsed, searchQuery, retrievalContext, responseTimeMs, modelUsed, feedback, createdAt}`

---

## F. Analytics

### F1. Trang Analytics tổng hợp

**APIs:**
- `GET /api/v1/analytics/overview`
- `GET /api/v1/analytics/conversations?period=7d&botId=`
- `GET /api/v1/analytics/messages?period=30d&botId=`
- `GET /api/v1/analytics/credits?period=30d`
- `GET /api/v1/analytics/channels?period=30d`

**Chức năng:**
- **KPI Cards:** totalConversationsToday, totalMessagesToday, creditsUsed, creditsRemaining, activeBots, totalDocuments
- **Chart: Conversations theo thời gian** — line/bar chart, bộ lọc period (7d/30d/90d) + botId
  - Dữ liệu: `[{date, count, avgMessages, avgResponseTimeMs}]`
- **Chart: Messages theo thời gian** — line chart, bộ lọc period + botId
- **Chart: Credit usage theo thời gian** — area/bar chart, bộ lọc period
- **Chart: Phân bổ theo channel** — pie/donut chart, bộ lọc period
- Tất cả charts hỗ trợ chọn period và filter theo bot

---

### F2. Analytics chi tiết theo Bot

**APIs:**
- `GET /api/v1/analytics/bots/:botId/top-questions?limit=20`
- `GET /api/v1/analytics/bots/:botId/satisfaction`

**Chức năng:**
- **Top câu hỏi:** danh sách 20 câu hỏi được hỏi nhiều nhất (grouped by similarity)
- **Satisfaction:** biểu đồ phân bổ rating `{1: count, 2: count, 3: count, 4: count, 5: count}`
- Có thể kết hợp vào F1 như sub-section khi chọn bot cụ thể

---

## G. Billing & Subscription

### G1. Trang Plans (Bảng giá)

**API:** `GET /api/v1/plans`

**Chức năng:**
- Hiện danh sách plans dạng pricing table/cards
- Mỗi plan hiện:
  - name: Free / Starter / Advanced / Pro
  - Giá: priceMonthly, priceYearly, priceWeekly (VND)
  - Giới hạn: maxBots, maxCreditsPerMonth, maxKnowledgeCharsPerBot, maxTeamMembers
  - Features flags: analytics, saveConversations, voiceInput, customCss, removeBranding, facebookIntegration, humanHandover, leadGeneration, apiAccess, customDomains, slaGuarantee, advancedModels
- Highlight plan hiện tại của user
- Nút "Chọn plan" / "Upgrade" / "Downgrade"

**Data model Plan:** `{id, name, slug, description, maxBots, maxCreditsPerMonth, maxKnowledgeCharsPerBot, maxTeamMembers, features, priceMonthly, priceYearly, priceWeekly}`

---

### G2. Trang Subscription hiện tại

**API:** `GET /api/v1/subscription` · `POST /api/v1/subscription` · `PATCH /api/v1/subscription` · `DELETE /api/v1/subscription`

**Chức năng:**
- Thông tin subscription hiện tại:
  - Plan name, status (active/past_due/cancelled/trialing)
  - Billing cycle: weekly / monthly / yearly
  - currentPeriodStart → currentPeriodEnd
  - cancelAtPeriodEnd (nếu true: hiện cảnh báo)
  - paymentMethod
- Credit usage hiện tại:
  - creditsAllocated, creditsUsed, topUpCredits
  - Progress bar: % đã dùng
- Actions:
  - Đổi billing cycle (`PATCH /api/v1/subscription`)
  - Hủy subscription (`DELETE /api/v1/subscription`) — hủy cuối kỳ, cần xác nhận
  - Upgrade/downgrade plan (`POST /api/v1/subscription`)

**Data model Subscription:** `{id, planId, status, billingCycle, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, paymentMethod}`
**Data model CreditUsage:** `{creditsAllocated, creditsUsed, topUpCredits, periodStart, periodEnd}`

---

### G3. Mua thêm Credits (Top-up)

**API:** `POST /api/v1/credits/top-up` · `GET /api/v1/credits/usage`

**Chức năng:**
- Hiện credit usage hiện tại (creditsUsed / creditsAllocated + topUpCredits)
- Form chọn số credits muốn mua
- Chọn phương thức thanh toán (VNPay / MoMo)
- Redirect sang trang thanh toán gateway
- Callback xử lý kết quả (`POST /api/v1/payments/vnpay/callback`, `POST /api/v1/payments/momo/callback`)

---

### G4. Lịch sử thanh toán (Payment History)

**API:** `GET /api/v1/payments` (paginated)

**Chức năng:**
- Danh sách transactions phân trang
- Mỗi record hiện:
  - type: subscription / top_up / refund
  - amount (VND)
  - currency
  - status: pending / completed / failed / refunded
  - paymentMethod
  - gatewayTransactionId
  - description
  - createdAt

**Data model PaymentHistory:** `{id, type, amount, currency, status, paymentMethod, gatewayTransactionId, description, createdAt}`

---

## H. Settings (Cài đặt)

### H1. Cài đặt Profile

**API:** `GET /api/v1/users/me` · `PATCH /api/v1/users/me`

**Chức năng:**
- Xem + chỉnh sửa: fullName, avatarUrl (upload ảnh), phone
- Hiện: email (read-only), authProvider (email/google), emailVerified, lastLoginAt
- Đổi mật khẩu (nếu authProvider = email)

---

### H2. Cài đặt Workspace (Tenant)

**API:** `GET /api/v1/tenants/:id` · `PATCH /api/v1/tenants/:id`

**Chức năng:**
- Xem + chỉnh sửa: name, logoUrl (upload), settings (JSON)
- Hiện: slug (read-only), planId (link sang Billing), status
- Chỉ admin+ mới được chỉnh sửa

---

### H3. Quản lý thành viên (Team Members)

**API:** `GET /api/v1/tenants/:id/members` · `POST /api/v1/tenants/:id/members` · `PATCH /api/v1/tenants/:id/members/:userId` · `DELETE /api/v1/tenants/:id/members/:userId`

**Chức năng:**
- Danh sách thành viên: fullName, email, role, status (active/invited/removed), joinedAt
- Nút "Mời thành viên" → modal nhập email + chọn role (admin/member/viewer)
  - Nếu email chưa có tài khoản → tạo user mới, status=invited
  - Kiểm tra quota: số thành viên < plan.maxTeamMembers
- Đổi role (chỉ owner): dropdown chọn role mới
- Xóa thành viên (cần xác nhận)
- Không thể xóa/đổi role chính mình nếu là owner duy nhất

---

## I. Embed Chat Widget (Public, không cần đăng nhập)

### I1. Chat Widget

**APIs:**
- `GET /api/v1/chat/:botId/config`
- `POST /api/v1/chat/:botId/messages` (SSE streaming)
- `GET /api/v1/chat/:botId/conversations/:convId/messages`

**Chức năng:**
- Widget nhúng vào website khách hàng (iframe hoặc bubble)
- Load config bot: name, avatarUrl, greetingMessage, suggestedQuestions, widgetConfig
- Áp dụng theme từ widgetConfig: theme, primaryColor, position, bubbleIcon, headerText, customCss, showPoweredBy
- Hiện greeting message khi mở lần đầu
- Hiện danh sách suggested questions (click để gửi)
- Input chat: gửi tin nhắn → nhận response streaming (SSE)
- Hiện lịch sử chat cho returning users (lưu conversationId + endUserId trong localStorage)
- Auth bằng bot API key hoặc domain validation (Referer header)
- Responsive: mobile-friendly

**SSE response format:** streaming text chunks từ AI Engine, accumulate thành full response

---

## J. Tổng kết số lượng

| Nhóm | Số màn | Ghi chú |
|------|--------|---------|
| A. Public (Auth) | 5 | Register, Login, Forgot PW, Reset PW, Verify Email |
| B. Dashboard & Layout | 2 | App Shell, Dashboard |
| C. Bot Management | 7 | List, Config, Personality, Widget, API/Embed, KBs, Channels |
| D. Knowledge Bases | 4 | KB List, KB Detail, Doc List, Doc Detail |
| E. Conversations | 2 | Conv List, Conv Detail (Chat thread) |
| F. Analytics | 2 | Analytics tổng hợp, Analytics theo Bot |
| G. Billing | 4 | Plans, Subscription, Top-up, Payment History |
| H. Settings | 3 | Profile, Workspace, Team Members |
| I. Embed Widget | 1 | Chat Widget (public) |
| **Tổng** | **30** | |

---

## K. Modals / Dialogs phụ (không phải màn riêng)

| Modal | Xuất hiện tại | Chức năng |
|-------|--------------|-----------|
| Xác nhận xóa | C1, C2, C6, D1, D2, D3, E1, H3 | "Bạn có chắc muốn xóa X?" |
| Tạo bot | C1 | Form: name, description |
| Tạo KB | D1 | Form: name, description, chunkSize, chunkOverlap |
| Upload documents | D3 | Drag & drop files, multi-file |
| Nhập URL | D3 | Form: URL input |
| Nhập text | D3 | Form: title + textarea |
| Gắn KB vào bot | C6 | Chọn KB từ dropdown, set priority |
| Mời thành viên | H3 | Form: email, role dropdown |
| Hiện API key | C5 | Show key 1 lần, nút copy |
| Chọn plan | G1 | Xác nhận upgrade/downgrade |
| Payment redirect | G3 | Thông báo redirect sang VNPay/MoMo |

---

## L. Data Models tham chiếu

| Model | Số fields chính | Dùng ở màn |
|-------|-----------------|------------|
| User | 12 | A1-A5, H1 |
| Tenant | 10 | B1, H2, H3 |
| TenantMember | 6 | H3 |
| Bot | 18 | C1-C7 |
| KnowledgeBase | 10 | D1-D2, C6 |
| Document | 18 | D3-D4 |
| Conversation | 12 | E1-E2 |
| Message | 13 | E2 |
| Channel | 8 | C7 |
| Plan | 12 | G1 |
| Subscription | 9 | G2 |
| CreditUsage | 6 | G2, G3, B2 |
| PaymentHistory | 9 | G4 |

---

## M. API Routes → Màn hình mapping

| API Group | Routes | Màn hình |
|-----------|--------|----------|
| Auth (8 routes) | register, login, logout, refresh, forgot-pw, reset-pw, verify-email, google-oauth | A1-A5, B1 |
| Users (2 routes) | GET/PATCH /me | H1 |
| Tenants (6 routes) | GET/PATCH tenant, GET/POST/PATCH/DELETE members | H2, H3 |
| Bots (15 routes) | CRUD, duplicate, personality, widget, api-key, embed, KB attach/detach | C1-C6 |
| Knowledge Bases (6 routes) | CRUD, reprocess-all | D1-D2 |
| Documents (7 routes) | upload, url, text, list, detail, delete, reprocess | D3-D4 |
| Channels (5 routes) | CRUD, facebook connect | C7 |
| Conversations (7 routes) | list, detail, messages, archive, search, rating, feedback | E1-E2 |
| Analytics (7 routes) | overview, conversations, messages, credits, channels, top-questions, satisfaction | F1-F2 |
| Billing (9 routes) | plans, subscription CRUD, top-up, usage, payments, vnpay/momo callbacks | G1-G4 |
| Chat Proxy (3 routes) | config, messages (SSE), history | I1 |
| **Tổng: 75 routes** | | **30 màn** |
