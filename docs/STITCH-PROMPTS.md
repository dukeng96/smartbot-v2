# Google Stitch Prompts — Smartbot Platform v2

> Mỗi prompt đã nhúng sẵn DESIGN ANCHOR block để giữ consistent.
> Không cần turn refine riêng cho layout/style.

---

## Phương pháp

**7 rounds. Mỗi prompt đều chứa block `DESIGN SYSTEM` giống hệt nhau** — đây là cách duy nhất ép Stitch giữ consistent vì nó không nhớ context giữa các lần generate.

**Cấu hình Stitch:** Standard Mode, Device = Web, 1280px width.

---

## DESIGN SYSTEM BLOCK (copy vào ĐẦU mọi prompt)

```
=== DESIGN SYSTEM — APPLY EXACTLY TO EVERY SCREEN ===

Platform: "Smartbot" — AI assistant builder SaaS.
Viewport: 1280px desktop.

SIDEBAR (NEVER CHANGES — identical on every page):
- Width: 220px, white background, right border 1px solid #E5E7EB
- Top: Smartbot logo icon (purple circle) + "Smartbot" text 16px semibold #111827, 20px padding
- Navigation: EXACTLY 7 items, ALWAYS in this order, NEVER add/remove/rename:
  1. Dashboard (icon: layout-grid)
  2. Assistants (icon: bot/message-square)
  3. Knowledge Bases (icon: book-open)
  4. Conversations (icon: message-circle)
  5. Analytics (icon: bar-chart)
  6. Billing (icon: credit-card)
  7. Settings (icon: settings-gear)
- Item style: 16px stroke icon + 13px regular #374151 text, 8px vertical / 12px horizontal padding
- Active item: #EDE9FE background, #6D28D9 text+icon, 6px border-radius
- Hover (inactive): #F9FAFB background
- Gap between items: 4px
- CRITICAL: The sidebar is the GLOBAL navigation. It does NOT change when viewing a bot detail, KB detail, or any sub-page. The same 7 items always appear.
- Bottom (pinned to sidebar bottom, 16px padding):
  - "CREDITS USED" — 10px uppercase #9CA3AF
  - "45 / 100" — 13px #374151
  - Progress bar: 4px height, full width, track #E5E7EB, fill #059669
  - "Upgrade plan" — 12px #6D28D9 link

HEADER BAR (always present, right of sidebar):
- Height: 56px, white background, bottom border 1px solid #E5E7EB
- Left: page title 22px semibold #111827
- Right: "Alex Johnson" 13px #374151 + 32px avatar circle (#EDE9FE bg, purple initial) + chevron-down

SUB-NAVIGATION FOR DETAIL PAGES (bot detail, KB detail):
- Do NOT modify the sidebar. Instead, add inside the content area:
  - Breadcrumb line: "← Assistants / Customer Support Bot" in 13px, "←" and parent are #6D28D9 links
  - Horizontal tab bar below breadcrumb: underline style, 13px semibold
  - Active tab: #6D28D9 text + 2px bottom border #6D28D9
  - Inactive tab: #6B7280 text, hover #374151
  - For bot detail: tabs are "General | Personality | Widget | API & Embed | Knowledge Bases | Channels"
  - For KB detail: no tabs, just breadcrumb

CONTENT AREA:
- Background: #F9FAFB
- Padding: 32px all sides
- Cards: white #FFFFFF, 1px solid #E5E7EB border, 12px radius, 20px padding, shadow 0 1px 2px rgba(0,0,0,0.04)

TYPOGRAPHY:
- Page title: 22px semibold #111827
- Section heading: 16px semibold #111827
- Card title: 14px semibold #111827
- Body: 13px regular #374151
- Secondary: 13px #6B7280
- Caption: 12px #9CA3AF
- Monospace (code/keys): 13px monospace #374151

COLORS:
- Primary: #6D28D9 | Hover: #5B21B6 | Light: #EDE9FE
- Success: #059669 | Success light: #ECFDF5
- Warning: #D97706 | Warning light: #FFFBEB
- Error: #DC2626 | Error light: #FEF2F2
- Info/processing: #2563EB | Info light: #EFF6FF
- Surface: #FFFFFF | Background: #F9FAFB | Border: #E5E7EB | Border light: #F3F4F6
- Text: #111827 / #374151 / #6B7280 / #9CA3AF

BUTTONS:
- Primary: #6D28D9 bg, white text, 8px radius, 13px semibold, 36px height
- Secondary: white bg, 1px #6D28D9 border, #6D28D9 text
- Danger: white bg, 1px #DC2626 border, #DC2626 text
- Ghost: transparent bg, #6D28D9 text

STATUS BADGES (pill):
- Active: #ECFDF5 bg, #059669 text
- Draft: #F3F4F6 bg, #6B7280 text
- Processing: #EFF6FF bg, #2563EB text
- Error: #FEF2F2 bg, #DC2626 text
- Paused: #FFFBEB bg, #D97706 text
- Pill style: 12px text, 4px 10px padding, 9999px radius

FORMS:
- Label: 13px semibold #374151, 6px margin bottom
- Input: 36px height, 1px #E5E7EB border, 8px radius, 12px padding, 13px text
- Focus: #6D28D9 border + 2px #EDE9FE ring
- Helper: 12px #9CA3AF, 4px margin top
- Toggle switch: 36px wide, 20px tall, on=#6D28D9, off=#E5E7EB

TABLES:
- Header: 12px uppercase #9CA3AF, 1px #E5E7EB bottom border
- Rows: 13px #374151, 56px height, 1px #F3F4F6 bottom border
- Hover: #F9FAFB

ABSOLUTELY NO: gradients, colored sidebar backgrounds, sidebar that changes per page, icons larger than 16px in nav, decorative illustrations, heavy shadows.

=== END DESIGN SYSTEM ===
```

---

## ROUND 0 — Foundation

### Prompt 0.1 — B1 + B2: App Shell + Dashboard

```
[PASTE DESIGN SYSTEM BLOCK ABOVE HERE]

Design the main Dashboard page for Smartbot.

SIDEBAR: Show all 7 nav items. "Dashboard" is active.

HEADER: Title "Dashboard". Right: "Alex Johnson" with avatar.

CONTENT:
- Row of 5 KPI cards, equal height, responsive row:
  - "Conversations Today" → large "23"
  - "Messages Today" → large "187"
  - "Credits Used" → "45 / 100" with small progress bar inside card
  - "Active Assistants" → "3"
  - "Documents" → "12"

- Below KPIs: inline row with "+ Create Assistant" (primary button) and "Upload Documents" (secondary button), aligned left, small size

- Section title "My Assistants" with "View all" link right-aligned
- Grid of 3 assistant cards (equal width):
  Card content:
  - Top row: 40px circle avatar (colored background + white initial letter) + assistant name (14px semibold) + status badge pill (Active/Draft)
  - Description text (13px muted, 1 line truncated)
  - Stats section (below subtle divider, 3 rows):
    - Row: "Conversations" label (left, 12px muted) + "1,248" value (right, 13px semibold)
    - Row: "Knowledge Bases" label + "2" value
    - Row: "Usage" label + thin progress bar + "33K / 250K chars" (right)
    NOTE: These counts come from backend computed fields (_count), treat as read-only display.
  - Three-dot menu icon top-right

  Sample cards:
  1. "C" purple circle | "Customer Support Bot" | Active badge | "Handles general inquiries..." | Stats: 1,248 convos, 2 KBs, 33K/250K
  2. "S" green circle | "Sales Qualifier" | Active badge | "Capturing leads from..." | Stats: 854 convos, 1 KB, 98K/250K
  3. "H" orange circle | "HR Internal FAQ" | Draft badge | "Onboarding and benefits..." | Stats: 0 convos, 0 KBs, 0/250K
```

---

## ROUND 1 — Auth

### Prompt 1.1 — A1 Register + A2 Login

```
Design two pages for Smartbot: Register and Login. These are public pages — NO sidebar, NO header. Minimal layout.

SHARED STYLE:
- Centered card: 420px wide, white background, 1px #E5E7EB border, 12px radius, 40px padding
- Above card: "Smartbot" logo/wordmark in #6D28D9, 20px font, centered
- Below logo: tagline "Build your AI assistant in minutes" in 13px #6B7280
- Page background: #F9FAFB
- All buttons/inputs follow the design system: 36px height, 8px radius, 13px text

REGISTER PAGE:
- Fields: Full Name, Email, Password (show/hide toggle + colored strength bar below: red/yellow/green)
- "Create Account" primary button (full width)
- Divider: thin line with "or" text centered
- "Continue with Google" outlined button with Google icon (full width)
- Bottom: "Already have an account? Sign in" in 13px, "Sign in" is purple link

LOGIN PAGE:
- Fields: Email, Password (show/hide toggle)
- "Forgot password?" link right-aligned above Sign In button, 12px #6D28D9
- "Sign In" primary button (full width)
- Same Google button and divider
- Bottom: "Don't have an account? Create one" with purple link

Generate both pages side by side.
```

### Prompt 1.2 — A3 Forgot Password + A4 Reset + A5 Verify

```
[PASTE DESIGN SYSTEM BLOCK]

Design three simple public pages for Smartbot. Same centered card layout as Login (420px, no sidebar):

PAGE 1 — Forgot Password:
- Title: "Reset your password" (18px semibold)
- Subtitle: "Enter your email and we'll send a reset link" (13px muted)
- Email input
- "Send Reset Link" primary button full width
- "← Back to Sign In" ghost link below

PAGE 2 — Reset Password:
- Title: "Set new password"
- Password input + Confirm Password input
- "Reset Password" primary button
- "← Back to Sign In" ghost link

PAGE 3 — Verify Email:
- Success state: green checkmark icon + "Email verified successfully" + "Continue to Dashboard" primary button
- Error state: red X icon + "Verification link expired" + "Resend verification email" ghost button

Generate all three. They are very simple single-card pages.
```

---

## ROUND 2 — Bot Management

### Prompt 2.1 — C1 Assistants List

```
[PASTE DESIGN SYSTEM BLOCK]

Design the Assistants list page. Sidebar: "Assistants" active.

HEADER: Title "Assistants". Right side: "+ Create Assistant" primary button.

CONTROLS ROW below header:
- Search input (240px): placeholder "Search assistants..."
- Status filter dropdown: "All Statuses"

CONTENT — Cards grid (2 columns):
Each card (white, bordered, 12px radius):
- Top: 48px circle avatar (colored bg + white initial) left-aligned
- Right of avatar: name (14px semibold) + status badge
- Below name: description (13px muted, 2 lines max)
- Stats section (divider above): 
  - "Conversations" label + "1,248" value
  - "Knowledge Bases" label + "2" value
  - "Usage" label + thin progress bar "33K / 250K chars"
- Footer: "Created 3 days ago" (12px muted) + three-dot menu right

Sample 4 cards:
1. "C" purple | Customer Support Bot | Active | 1,248 convos | 2 KBs | 33K/250K
2. "S" green | Sales Qualifier | Active | 854 convos | 1 KB | 98K/250K
3. "H" orange | HR Internal FAQ | Draft | 0 convos | 5 KBs | 60K/250K (warn: nearly full)
4. "T" blue | Technical Support | Paused | 412 convos | 3 KBs | 180K/250K (bar orange)

Pagination: "Showing 1-4 of 4 assistants" + Previous/Next buttons

Bottom status bar showing credits: "Usage: 45 / 100 credits" + "Upgrade plan" link
```

### Prompt 2.2 — C2 Assistant General Config

```
[PASTE DESIGN SYSTEM BLOCK]

Design the Assistant general configuration page.

SIDEBAR: Show "Assistants" active, PLUS a sub-navigation for this assistant:
- Below the main nav, show indented sub-items: Dashboard, Personality, Widget, API & Embed, Knowledge Bases, Channels, Settings
- Or use BREADCRUMB + HORIZONTAL TABS at top of content area:
  Breadcrumb: "← Assistants / Customer Support Bot"
  Tabs: General (active) | Personality | Widget | API & Embed | Knowledge Bases | Channels

Choose horizontal tabs approach — cleaner for 6 tabs.

CONTENT — "General" tab:

Section "Basic Info":
- Row: circular avatar upload (80px, camera overlay) on left
- Right of avatar: Name input ("Customer Support Bot") + Status dropdown (Active) side by side
- Below: Description textarea ("Handles general inquiries and tier 1 support tickets autonomously.")

Section "RAG Configuration":
- Two inputs side by side:
  - "Number of chunks to retrieve" → number input, value 5, range 1-20
  - "Conversation memory (turns)" → number input, value 5, range 1-20
- Helper text under each explaining the setting (12px muted)

Section "Statistics" — 3 small stat cards in a row:
- "Knowledge Usage": "33,948" large + "/ 250K chars" muted, with thin progress bar
- "Total Conversations": "1,248" large + sparkline trend icon
- "Connected Channels": "2" large + small icons (web + facebook)

Bottom actions row:
- "Duplicate Assistant" secondary button
- "Delete Assistant" danger button  
- "Save Changes" primary button (right-aligned)
```

### Prompt 2.3 — C3 Personality Config

```
[PASTE DESIGN SYSTEM BLOCK]

Design the Personality tab for an assistant. Same breadcrumb + horizontal tabs, "Personality" tab active.

TWO COLUMNS: form left (58%), live preview right (42%).

LEFT COLUMN:

Section "System Prompt":
- Label + large textarea (8 rows), monospace-ish font
- Helper: "Instructions defining how your assistant behaves"

Section "Greeting Message":
- Label + text input
- Value: "Xin chào! Tôi có thể giúp gì cho bạn?"

Section "Suggested Questions":
- Toggle "Show suggested questions" (switch, on)
- List of inputs, each with drag handle (⠿) + text + delete (×) icon:
  1. "Các sản phẩm AI của VNPT?"
  2. "Cách đăng ký tài khoản?"
  3. "Chính sách hoàn tiền?"
- "+ Add question" ghost button below list

Section "Fallback Message":
- Text input: "Xin lỗi, tôi không tìm thấy thông tin liên quan."

Section "Personality" (collapsible):
- Tone: dropdown (Professional / Friendly / Casual)
- Language: dropdown (Vietnamese / English / Auto-detect)
- Restrictions: textarea

NOTE FOR DEVELOPERS: The Personality section maps to Bot.personality JSON field with structure:
{
  "tone": "Professional" | "Friendly" | "Casual",
  "language": "Vietnamese" | "English" | "Auto-detect",
  "restrictions": "free text string"
}
Show these as:
- Tone: dropdown with 3 options
- Language: dropdown with 3 options
- Restrictions: textarea for free text
All three are optional — empty/null means "use defaults"

"Save" primary button at bottom

RIGHT COLUMN — "Preview":
- Label "Chat Preview" above
- Realistic chat widget card (340px wide, rounded, subtle shadow):
  - Header: "Customer Support Bot" + green dot + "AI Assistant"
  - Greeting message bubble (from assistant)
  - Suggested question chips rendered below
  - Sample user message "Các sản phẩm AI của VNPT?"
  - Sample assistant response
  - Input bar with placeholder "Type a message..."
```

### Prompt 2.4 — C4 Widget Styling

```
[PASTE DESIGN SYSTEM BLOCK]

Design the Widget styling tab. Same breadcrumb + tabs, "Widget" tab active.

TWO COLUMNS: settings left (55%), preview right (45%).

LEFT COLUMN:

Section "Theme":
- Two selectable cards side by side: "Light" (selected, purple border) and "Dark"
- Each shows tiny widget thumbnail

Section "Primary Color":
- 6 preset color circles in a row (purple, blue, teal, green, red, orange) — selected has checkmark
- Hex input below: "#6D28D9"
- Color picker square

Section "Layout":
- "Chat Bubble Position": two option cards — "Bottom Right" (selected) / "Bottom Left"
- "Bubble Icon": 4 icon option cards (chat bubble, headset, robot, spark) + "Upload custom" link

Section "Header":
- "Header Text": text input "Chat with us"

Section "Branding":
- "Show Powered by Smartbot": toggle switch (on)

Section "Custom CSS":
- IF user's plan has features.customCss = true:
  Collapsible section → monospace textarea (8 rows) for CSS overrides
  Helper: "Override widget styles with custom CSS"
- IF user's plan has features.customCss = false:
  Locked section with 🔒 lock icon + "Custom CSS" label (grayed out)
  Text: "Available on Advanced plan and above"
  "Upgrade" purple text link → navigates to Plans page (G1)

Plan feature check: GET /subscription → plan.features.customCss (boolean)

"Save" primary button

RIGHT COLUMN — "Widget Preview":
- Label "Appearance Preview"
- Show BOTH states stacked:
  - Collapsed: floating circle button (56px) in bottom-right with chosen icon, in chosen color
  - Expanded: full chat widget with applied theme, color, header text, avatar, branding footer
  - Both on a light gray (#F3F4F6) simulated background
```

---

## ROUND 3 — Bot Deploy + KB

### Prompt 3.1 — C5 API & Embed

```
[PASTE DESIGN SYSTEM BLOCK]

Design the "API & Embed" tab. Same breadcrumb + tabs, "API & Embed" active.

Section "API Key":
- Card with:
  - If no key: text "No API key generated" + "Generate API Key" primary button
  - If key exists: masked display "sk-a3f8•••••••••" in monospace, + "Revoke Key" danger button
  - Note text: "API key is shown only once when generated"

Section "Embed Codes":
Three cards in a row (equal height):

Card 1 "Chat Bubble Widget":
- Small chat-bubble icon at top
- Title: "Chat Bubble Widget" (14px semibold)
- Description: "Floating chat button on your website" (13px muted)
- 3 bullet points with green checkmarks: "Appears on all pages", "Mobile responsive", "One-time installation"
- Code block: dark bg (#1E1E2E), monospace 12px, white/green text showing <script> tag
- "Copy" outlined button with clipboard icon below code

Card 2 "iFrame Embed":
- Window icon
- "Embed directly into a page"
- Bullets: "Full size control", "Perfect for help pages", "Responsive sizing"
- Code block with iframe snippet
- "Copy" button

Card 3 "Direct Link":
- Link icon
- "Share a standalone page"
- Bullets: "Email signatures", "Social media", "Direct to customers"
- URL display: https://chat.smartbot.vn/bot/629e...
- "Copy" button
- Quick Share: small icon buttons row — Email, Zalo, Facebook
```

### Prompt 3.2 — C6 Knowledge Bases tab (within bot)

```
[PASTE DESIGN SYSTEM BLOCK]

Design the "Knowledge Bases" tab inside an assistant detail page for Smartbot.

Sidebar: "Assistants" active (6 items, no Dashboard). 
Content area: Breadcrumb "← Assistants / Customer Support Bot" + horizontal tabs. "Knowledge Bases" tab is active (underlined purple).

THIS IS THE MAIN SCREEN — show the full page, not a modal:

Section title: "Attached Knowledge Bases"
Description text: "These knowledge bases are searched when your assistant answers questions. Drag to reorder priority."

"+ Attach Knowledge Base" primary button, right-aligned with section title.

TABLE (this is the main content, should fill most of the page):
Columns: Priority (#), Name, Documents, Characters, Status, Actions

Rows:
1 | Product FAQs | 5 docs | 125,000 chars | Active ✓ | [Detach] button
2 | Company Policies | 2 docs | 48,000 chars | Active ✓ | [Detach] button
3 | Marketing Content | 1 doc | 12,000 chars | Processing ⟳ | [Detach] button

Each row has a drag handle (⠿) on the left for reordering priority.
Detach button is danger text style (red, no border).
Table rows are 56px height, standard table styling.

Below table: helper text "Lower priority number = searched first"

BACKEND NOTE: Drag-to-reorder calls a new endpoint:
PATCH /api/v1/bots/:id/knowledge-bases/reorder
Body: { items: [{knowledgeBaseId: "uuid", priority: 1}, {knowledgeBaseId: "uuid", priority: 2}] }

Until this endpoint exists, show priority as a static number column (editable via inline number input per row as fallback).
On blur/change of priority input → call existing POST /bots/:id/knowledge-bases to re-attach with new priority.

If no KBs attached, show empty state: centered icon + "No knowledge bases attached yet" + "Attach one to give your assistant knowledge to draw from" + "Attach Knowledge Base" button.

MODAL (secondary — only describe, do NOT make it the focus of the design):
When user clicks "+ Attach Knowledge Base", a modal appears with: dropdown to select KB from tenant's list, priority number input, "Attach" + "Cancel" buttons.
```

### Prompt 3.3 — C7 Channels tab

```
[PASTE DESIGN SYSTEM BLOCK]

Design the "Channels" tab within an assistant detail page. Same breadcrumb + tabs.

Grid of channel cards (2 per row):

1. Web Widget — always present:
  - Icon: globe/chat
  - Status: "Active" green badge
  - "Auto-configured with your assistant"
  - "Go to Widget settings" link → C4

2. Facebook Messenger:
  - Icon: Facebook Messenger logo
  - Status: "Not connected" gray badge OR "Connected" green + page name
  - "Connect" primary button (opens OAuth flow) OR "Disconnect" danger button
  - Connected: show "Last active: 2 hours ago"

3. Telegram:
  - Icon: Telegram logo  
  - Status: not connected / connected
  - Connect: form input for Bot Token + "Connect" button

4. Zalo OA:
  - Icon: Zalo logo
  - Same pattern

5. API:
  - Icon: code brackets
  - "Requires API Key" — link to "API & Embed" tab
  - If API key exists: "Active" badge

Each connected channel shows: status, connectedAt, lastActiveAt
```

### Prompt 3.4 — D1 Knowledge Bases List

```
[PASTE DESIGN SYSTEM BLOCK]

Design the Knowledge Bases list page for Smartbot. This is the top-level KB management page.

Sidebar: "Knowledge Bases" active.

HEADER: Page title "Knowledge Bases" on left. "+ Create" primary button on right.

THIS IS THE MAIN SCREEN — show the full table view, not a modal:

TABLE (this is the hero content, fills the page):
Columns: Name, Description, Documents, Characters, Status, Created, Actions (⋯)

Rows (5 sample rows to fill the table):
- "Product FAQs" | "Thông tin sản phẩm và giải đáp thắc mắc" | 5 docs | 125,000 | Active ✓ | 3 days ago | ⋯
- "Company Policies" | "Nội quy, quy chế công ty" | 2 docs | 48,000 | Active ✓ | 1 week ago | ⋯
- "Marketing Content" | "Tài liệu marketing campaigns" | 1 doc | 12,000 | Processing ⟳ | 2 hours ago | ⋯
- "Sales Documentation" | "Bảng giá, hợp đồng mẫu" | 8 docs | 210,000 | Active ✓ | 2 weeks ago | ⋯
- "Technical Docs" | "Hướng dẫn kỹ thuật, API docs" | 3 docs | 67,000 | Error ✗ | 1 month ago | ⋯

Table styling: header row uppercase muted, body rows 56px height, hover highlight, click row to navigate to detail page.
Three-dot menu (⋯) per row: "View Details", "Delete" (red text).
Pagination: "Showing 1-5 of 5 knowledge bases" + Previous/Next.

Empty state (if no KBs): centered icon + "No knowledge bases yet" + "Create your first knowledge base to start uploading documents" + "Create Knowledge Base" primary button.

MODAL (secondary — only shown when user clicks "+ Create", do NOT make this the main design):
Title: "Create Knowledge Base". Fields: Name (required), Description (optional), collapsible "Advanced Settings" with Chunk Size (default 500) and Chunk Overlap (default 50). Buttons: "Cancel" + "Create".
```

---

## ROUND 4 — Documents + Conversations

### Prompt 4.1 — D2 + D3: KB Detail + Documents

```
[PASTE DESIGN SYSTEM BLOCK]

Design the Knowledge Base detail page showing KB info and its documents.

BREADCRUMB: "← Knowledge Bases / Product FAQs"

TOP CARD — KB Info:
- Name: "Product FAQs" (editable)
- Description textarea (editable)
- Two inline fields: Chunk Size (500) | Chunk Overlap (50) — editable
- Read-only: Embedding model "vnpt-bge-m3", Collection "kb_xxx"
- Stats: "5 documents • 125,000 characters"
- Buttons: "Save Changes" (primary), "Reprocess All" (secondary), "Delete KB" (danger text)

CHARACTER USAGE BAR (below KB info card):
- Visual bar: filled portion colored (blue for URLs, purple for files), empty dots for remaining
- Right: "125,000 / 250,000" text
- Legend: "● URLs 78,000  ● Files 47,000"

SECTION "Documents":
- Three buttons: "Upload Files" (primary), "Add URL" (secondary), "Add Text" (secondary)
- Filter tabs: "All" | "Files" | "URLs" | "Text"
- Search input right-aligned

Table:
Columns: Source Name, Type (badge), Status, Progress, Characters, Chunks, Enabled, Actions (⋯)

Rows:
- "report-2024.pdf" | File 📄 | Completed ✓ | 100% | 45,200 | 92 | toggle on | ⋯
- "https://vnptai.io/" | URL 🔗 | Completed ✓ | 100% | 27,576 | 55 | toggle on | ⋯
- "product-spec.docx" | File 📄 | Processing ⟳ | 60% bar + "embedding" | — | — | — | ⋯
- "intro-text" | Text 📝 | Error ✗ | — | — | — | toggle on | ⋯

Progress column: thin progress bar (colored by status) + step text when processing
Error row: red tint background, errorMessage tooltip on hover

Pagination: "Showing 1-4 of 4"

MODAL "Upload Files":
- Dashed border drop zone (280px tall): cloud icon + "Drag and drop files or click to browse"
- Supported formats text: "PDF, DOCX, PPTX, XLSX, TXT, CSV, images • Max 128MB"
- File queue list below: filename + size + remove (×) button each
- "Upload & Process" primary + "Cancel" buttons

MODAL "Add URL":
- URL text input + helper "We'll crawl and extract content from this page"
- "Add URL" primary + "Cancel"

MODAL "Add Text":
- Title input (optional)
- Large textarea (10 rows) + character count bottom-right
- "Add Text" primary + "Cancel"
```

### Prompt 4.1b — D4: Document Detail (NEW)

```
[PASTE DESIGN SYSTEM BLOCK]

Design the Document detail page for Smartbot. Sidebar: "Knowledge Bases" active.

BREADCRUMB: "← Knowledge Bases / Product FAQs / report-2024.pdf"

THIS IS THE MAIN SCREEN — show the full detail page.

CARD — "Document Info":
- Header row: file type icon + "report-2024.pdf" (18px semibold) + status badge (Completed ✓)
- Info grid (2 columns):
  - Source Type: "File Upload" badge (purple pill)
  - MIME Type: "application/pdf" monospace
  - File Size: "2.4 MB"
  - Source URL: "—" (only shown if sourceType = url_crawl)
  - Uploaded: "Mar 12, 2026 10:28 AM"
- Toggle row: "Enabled" label + toggle switch (on) + helper "Disabled documents are excluded from retrieval"

CARD — "Processing Status":
- Horizontal stepper (3 steps connected by lines):
  Step 1: "Extracting" ✓ green check → Step 2: "Chunking" ✓ green check → Step 3: "Embedding" ✓ green check
- Progress bar: 100% (green, full width)
- Timestamps row: "Started: 10:30 AM" | "Completed: 10:32 AM" | "Duration: 2m 14s"

For ERROR state (show as alternate variant or note):
- Stepper shows: Step 1 ✓ → Step 2 ✗ red X (failed here) → Step 3 ○ gray (not reached)
- Red alert box below: "Error: Failed to chunk document — invalid encoding detected"
- "Retry Processing" primary button inside alert

CARD — "Statistics" (3 mini cards in row):
- "Characters": "45,200" large number
- "Chunks": "92" large number
- "Markdown Stored": "Yes ✓" green text (indicates markdownStoragePath exists for re-chunking)

CARD — "Metadata" (collapsible, default collapsed):
- Toggle "Show metadata"
- When expanded: JSON code block showing:
  {"author": "Nguyen Van A", "pages": 24, "language": "vi", "quality_score": 4.2}
- Small "Edit" text button to switch to editable textarea mode

BOTTOM ACTION ROW:
- "Reprocess Document" secondary button (left)
- "Delete Document" danger button (right)
- Delete triggers confirmation modal

Show the completed/success state as the primary view.
```

### Prompt 4.2 — E1 Conversations List

```
[PASTE DESIGN SYSTEM BLOCK]

Design the Conversations page. Sidebar: "Conversations" active.

HEADER: "Conversations"

CONTROLS:
- Bot selector dropdown: "All Assistants" / specific bot names
- Channel filter: "All Channels" / Web Widget / Facebook / Telegram / Zalo / API
- Status filter: "All" / Active / Closed / Archived
- Date range picker
- Search input: "Search messages..."

TABLE:
Columns: User, Channel, Messages, Last Activity, Status, Rating

NOTE: "Last Activity" shows timestamp (e.g., "2 hours ago", "Yesterday"), NOT message content.
The backend Conversation model only has lastMessageAt (timestamp), no lastMessageContent field.

Rows:
- [avatar] "Anonymous" | Web Widget (blue badge) | 8 msgs | 2 hours ago | Active (green) | ⭐⭐⭐⭐
- [avatar] "Nguyễn Văn A" | Facebook (blue badge) | 3 msgs | Yesterday | Closed (gray) | —
- [avatar] "API Client" | API (purple badge) | 12 msgs | 3 days ago | Closed (gray) | 👍
- [avatar] "Anonymous" | Telegram (blue badge) | 5 msgs | 5 hours ago | Active (green) | —

Row height: 60px. Click → E2 detail.
Row action: Archive (confirmation)

Pagination at bottom.
```

### Prompt 4.3 — E2 Conversation Detail

```
[PASTE DESIGN SYSTEM BLOCK]

Design the Conversation detail page (chat thread view).

BREADCRUMB: "← Conversations"

TWO COLUMNS: chat (68%) + panel (32%)

LEFT — CHAT THREAD:
- Header bar: [avatar] "Anonymous" • Web Widget badge • Active badge • "Started 2h ago • 8 messages"
- Chat bubbles (chronological, scrollable):
  
  Assistant bubble (left, white bg, 1px border):
  "Xin chào! Tôi có thể giúp gì cho bạn?"
  [12:01 PM]
  
  User bubble (right, #EDE9FE purple bg):
  "Cho tôi biết về gói dịch vụ Starter"
  [12:01 PM]
  
  Assistant bubble (left):
  "Gói Starter có giá 199.000₫/tháng, bao gồm 5 assistants..."
  [12:02 PM • 1.2s response]
  
  Below each assistant bubble: expandable "Sources & Debug" section (collapsed by default):
  - Search query: "gói dịch vụ Starter giá bao nhiêu"
  - Sources: list of [{doc name, relevance score}]
  - Model: "llm-medium-v4", Tokens: 150 in / 89 out, Credits: 1
  
  Each assistant bubble has: 👍 👎 feedback buttons (small, muted)

RIGHT — METADATA PANEL:
Card "User Info":
- Name: "Anonymous"
- Channel: Web Widget
- Metadata: IP, browser/OS if available

Card "Metrics":
- Messages: 8
- Duration: 12 min
- Avg response: 1.3s

Card "Feedback":
- Rating: ⭐⭐⭐⭐ (4/5) or "Not rated"
- "Rate this conversation" → star selector + text input
```

---

## ROUND 5 — Analytics + Plans

### Prompt 5.1 — F1 + F2: Analytics

```
[PASTE DESIGN SYSTEM BLOCK]

Design the Analytics page. Sidebar: "Analytics" active.

TOP: Period selector pills (7 days / 30 days / 90 days) + Bot filter dropdown ("All Assistants")

KPI CARDS (5, equal row):
- "Conversations" → "1,247" (large number only, no change badge)
- "Messages" → "8,432" (large number only)
- "Credits Used" → "2,847 / 12,500" with circular mini progress bar
- "Active Assistants" → "3"
- "Documents" → "24"

NOTE: Do NOT show percentage change badges on KPI cards.
Backend GET /analytics/overview returns raw values only, no period comparison.
Change indicators may be added in a future version when the backend supports it.
The trend data is shown in the CHARTS below (conversations over time) — these show growth patterns.

CHARTS (2 columns):
Left (60%): "Conversations Over Time" — area chart, purple fill, date x-axis
Right (40%): "By Channel" — donut chart (Web 65%, Facebook 25%, Telegram 5%, API 5%) + legend

BOTTOM (2 columns):
Left: "Top Questions" — numbered list, each with count badge:
  1. "Giá gói dịch vụ là bao nhiêu?" (47)
  2. "Làm sao để đăng ký?" (35)
  3. "Chính sách hoàn tiền?" (28)
  4. "Hỗ trợ kỹ thuật liên hệ đâu?" (22)
  5. "Các sản phẩm AI của VNPT?" (19)

Right: "User Satisfaction" — horizontal bars:
  5 stars: ████████ 42%
  4 stars: ██████ 31%
  3 stars: ███ 15%
  2 stars: █ 7%
  1 star: █ 5%
  Summary: "Average: 4.1/5 • 234 rated"
```

### Prompt 5.2 — G1 Plans

```
[PASTE DESIGN SYSTEM BLOCK]

Design the Plans/Pricing page. Sidebar: "Billing" active.

HEADER: "Subscription"

Current plan indicator: pill "You're on Free" with purple outline

Billing toggle: "Monthly" | "Yearly (save 30%)" — pill toggle, selected is purple

4 PLAN CARDS in row (equal width, equal height):

FREE (0₫):
- Badge: none
- "For testing"
- Limits: 1 assistant, 100 credits/mo, 250K chars, 1 member
- Feature list with ✓/✗:
  ✗ Analytics
  ✗ Save conversations
  ✗ Custom CSS
  ✗ Remove branding
  ✗ Facebook
  ✗ API access
- Button: "Current Plan" (disabled gray)

STARTER (199.000₫/mo):
- "For small businesses"
- 5 assistants, 3,000 credits, 25M chars, 1 member
- ✓ Analytics, ✓ Save conversations, ✓ Voice input, 1 domain
- Button: "Upgrade" (primary)

ADVANCED (699.000₫/mo) — "Popular" top banner/badge:
- "For growing teams"
- 10 assistants, 12,500 credits, 50M chars, 3 members
- ✓ All Starter +, ✓ Custom CSS, ✓ Remove branding, ✓ Facebook, ✓ Handover, 5 domains
- Card: purple top border 3px
- Button: "Upgrade" (primary)

PRO (2.099.000₫/mo):
- "For high-volume businesses"
- 50 assistants, 50,000 credits, 200M chars, 10 members
- ✓ All Advanced +, ✓ API access, ✓ SLA, ✓ Advanced models, 50 domains
- Button: "Upgrade" (primary)

When yearly toggle: show crossed-out monthly price + discounted yearly price.
```

### Prompt 5.3 — G2 Subscription

```
[PASTE DESIGN SYSTEM BLOCK]

Design the Subscription management page. Same "Billing" sidebar active, or a sub-page from Plans.

Section "Current Subscription" (card):
- Row: Plan "Starter" badge | Status "Active" green badge | Billing "Monthly"
- Period: "Mar 15, 2026 → Apr 15, 2026"
- Payment: "VNPay"
- Buttons: "Change Plan" (secondary), "Change Cycle" (ghost), "Cancel" (danger text — "Cancels at end of period")

Section "Credit Usage" (card):
- Large circular progress or horizontal bar: 1,247 / 3,000 used
- "Resets Apr 15, 2026" muted text
- Optional: breakdown mini bars per bot
- "Buy More Credits" secondary button → G3

Section "Payment History" (card):
- Table: Date | Description | Amount | Status | Invoice
- 3 sample rows:
  "15/03/2026" | "Starter - Monthly" | "199.000₫" | Paid ✓ | ↓
  "15/02/2026" | "Starter - Monthly" | "199.000₫" | Paid ✓ | ↓
  "10/02/2026" | "Credit Top-up (500)" | "49.000₫" | Paid ✓ | ↓
- "View all" link → G4
```

### Prompt 5.4 — G3: Top-up Credits (NEW)

```
[PASTE DESIGN SYSTEM BLOCK]

Design the Credit Top-up page for Smartbot. Sidebar: "Billing" active.

HEADER: "Buy More Credits"
BREADCRUMB: "← Billing / Buy Credits"

THIS IS THE MAIN SCREEN — show the full purchase flow page.

CARD — "Current Balance":
- Large display: "1,247" (24px semibold) + "credits remaining" (13px muted)
- Below: "of 3,000 allocated + 500 top-up = 3,500 total" (12px muted)
- Horizontal progress bar: ~36% filled (#059669 green)
- "Resets Apr 15, 2026" caption

CARD — "Select Credit Package":
4 selectable cards in a row (only one can be selected at a time):
- Card 1: "500" large + "credits" small | "49.000₫" price | "98₫/credit" unit
- Card 2: "2.000" large + "credits" | "179.000₫" | "90₫/credit" | small "Best Value" green badge — THIS ONE PRE-SELECTED with purple 2px border + #EDE9FE background
- Card 3: "5.000" large + "credits" | "399.000₫" | "80₫/credit"
- Card 4: "Custom" | number input field for custom amount | calculated price below dynamically

Unselected cards: white bg, 1px #E5E7EB border
Selected card: #EDE9FE bg, 2px #6D28D9 border

CARD — "Payment Method":
Two radio cards side by side (selectable):
- "VNPay" + VNPay logo placeholder (selected: purple border)
- "MoMo" + MoMo logo placeholder
- Helper: "You will be redirected to complete payment" (12px muted)

BOTTOM:
- Order summary line: "2.000 credits × 90₫ = 179.000₫" (14px semibold)
- Row: "Cancel" ghost link (left) + "Purchase Credits" primary button (right)
```

### Prompt 5.5 — G4: Payment History (NEW)

```
[PASTE DESIGN SYSTEM BLOCK]

Design the Payment History page for Smartbot. Sidebar: "Billing" active.

HEADER: "Payment History"
BREADCRUMB: "← Billing / Payment History"

THIS IS THE MAIN SCREEN — show the full table page.

CONTROLS ROW:
- Date range: two date inputs with calendar icon, separated by "—"
- Type filter dropdown: "All Types" (options: Subscription, Top-up, Refund)
- Status filter dropdown: "All Statuses" (options: Completed, Pending, Failed, Refunded)
- Right-aligned: "Export CSV" secondary button

TABLE (hero content — 8 rows):
Columns: Date | Description | Type | Amount | Status | Method | Invoice

Rows:
1. 15/03/2026 | Starter - Monthly | Subscription (purple pill) | 199.000₫ | Completed ✓ (green pill) | VNPay | ↓ icon
2. 10/03/2026 | Credit Top-up (2.000) | Top-up (blue pill) | 179.000₫ | Completed ✓ (green) | MoMo | ↓ icon
3. 15/02/2026 | Starter - Monthly | Subscription (purple) | 199.000₫ | Completed ✓ (green) | VNPay | ↓ icon
4. 01/02/2026 | Credit Top-up (500) | Top-up (blue) | 49.000₫ | Completed ✓ (green) | VNPay | ↓ icon
5. 15/01/2026 | Starter - Monthly | Subscription (purple) | 199.000₫ | Failed ✗ (red pill) | VNPay | —
6. 10/01/2026 | Starter - Monthly (retry) | Subscription (purple) | 199.000₫ | Completed ✓ (green) | VNPay | ↓ icon
7. 15/12/2025 | Pro → Starter refund | Refund (orange pill) | -500.000₫ | Refunded ↩ (orange pill) | — | ↓ icon
8. 01/12/2025 | Pro - Monthly | Subscription (purple) | 2.099.000₫ | Completed ✓ (green) | MoMo | ↓ icon

Type badges: Subscription=#EDE9FE+#6D28D9, Top-up=#EFF6FF+#2563EB, Refund=#FFFBEB+#D97706
Status badges: Completed=#ECFDF5+#059669, Failed=#FEF2F2+#DC2626, Pending=#FFFBEB+#D97706, Refunded=#FFFBEB+#D97706
VND amounts right-aligned. Refund amounts in red with minus sign.
Invoice column: small download icon button, disabled (—) if status ≠ Completed.

Pagination: "Showing 1-8 of 24 transactions" + Previous / Next

FOOTER CARD — "Summary" (below table):
3 inline stats: "Total Spent (2026): 1.024.000₫" | "Subscriptions: 796.000₫" | "Top-ups: 228.000₫"
```

---

## ROUND 6 — Settings

### Prompt 6.1 — H1 Profile + H2 Workspace + H3 Team

```
[PASTE DESIGN SYSTEM BLOCK]

Design the Settings page with three sub-tabs. Sidebar: "Settings" active.

Sub-tabs at top: Profile | Workspace | Team Members

TAB 1 — PROFILE (H1):
- Avatar upload: 80px circle with camera overlay
- Fields: Full Name (input), Email (read-only + "Verified ✓" badge), Phone (input)
- Auth provider: "Email" or "Google" badge (read-only)
- Last login: timestamp (read-only)

"Change Password" section (ONLY visible if authProvider = "email", hidden for Google OAuth users):
- Collapsible, default collapsed, with "Change Password" header + expand chevron
- When expanded:
  - "Current Password" — password input (required)
  - "New Password" — password input with strength indicator bar (required)
  - "Confirm New Password" — password input (required, must match)
  - "Update Password" secondary button (not the main Save — this is a separate action)
- Calls: PATCH /api/v1/users/me with body {currentPassword, newPassword}
- On success: collapse section + show green toast "Password updated"
- On error (wrong current password): show red inline error

For Google OAuth users (authProvider = "google"):
- Show text: "You signed in with Google. Password is managed by your Google account."
- No password fields shown

- "Save Changes" primary button (for Name/Phone updates only)

TAB 2 — WORKSPACE (H2):
- Workspace name: input
- Slug: read-only monospace text
- Logo: image upload (rectangular, 160x40)
- Plan: badge linking to Billing
- Status: Active badge
- "Save Changes" primary button

TAB 3 — TEAM MEMBERS (H3):
- "Invite Member" primary button
- Table: Name, Email, Role (badge), Status, Joined, Actions
  "Admin User" | admin@... | Owner 👑 | Active | Mar 1 | —
  "Staff" | staff@... | Member | Active | Mar 10 | [Role dropdown] [Remove]
  "Pending" | new@... | Viewer | Invited ⏳ | — | [Resend] [Cancel]
- Role badge colors: Owner purple, Admin blue, Member gray, Viewer light gray

MODAL "Invite Member":
- Email input
- Role dropdown: Admin / Member / Viewer
- Helper: "They'll receive an invitation email"
- "Send Invite" + "Cancel"
- Warning if at team member limit: "Your plan allows {N} members. Upgrade to add more."
```

---

## ROUND 7 — Embed Widget

### Prompt 7.1 — I1 Chat Widget

```
Design an embeddable chat widget for Smartbot. This is NOT inside the dashboard — it's what appears on a customer's website. Design it as a standalone floating component on a neutral gray (#F3F4F6) background.

NO sidebar, NO dashboard chrome.

TWO STATES:

STATE 1 — COLLAPSED:
- Floating circle button, 56px diameter, bottom-right
- #6D28D9 purple background, white chat icon inside
- Small shadow: 0 4px 12px rgba(0,0,0,0.15)

STATE 2 — EXPANDED:
- Floating card, 380px wide × 560px tall, 16px border-radius, shadow
- Header: #6D28D9 bg, white text
  - Assistant name "Customer Support" + green dot
  - Subtitle "AI Assistant"
  - Minimize (−) and close (×) buttons white
- Chat area (white bg, scrollable):
  - Bot greeting: "Xin chào! Tôi có thể giúp gì cho bạn?"
  - Suggested question chips below greeting: 
    "Các sản phẩm AI?", "Cách đăng ký?", "Chính sách hoàn tiền?"
  - User message: right-aligned, #EDE9FE bg
  - Bot response: left-aligned, #F3F4F6 bg
  - Typing indicator: three animated dots in bot bubble
- Input bar: text input + purple send button (arrow icon)
- Footer: "Powered by Smartbot" in 11px #9CA3AF (shown if showPoweredBy=true)

Show both states side by side on the neutral background.
```

---

## Refine Prompts (nếu cần)

### Nếu sidebar bị lệch
```
The sidebar does NOT match the design system. Fix:
- Width exactly 220px, white background, 1px solid #E5E7EB right border
- Nav items: 16px stroke icons + 13px text, 8px gap between items
- Active item: #EDE9FE background, #6D28D9 text, 6px border-radius
- Bottom: "CREDITS USED" 10px uppercase, "45/100" 13px, 4px green progress bar
- Do not add any colored sidebar backgrounds, rounded sidebar shapes, or decorative elements
```

### Nếu card style lệch
```
All content cards must use: white background, 1px solid #E5E7EB border, 12px border-radius, 20px padding, shadow 0 1px 2px rgba(0,0,0,0.04). No heavy shadows, no colored card backgrounds.
```

### Brand reminder
```
Brand name is "Smartbot" everywhere. UI label "Assistant" not "Agent" or "Bot" or "Chatbot". Code/API can say "bot" internally but user-facing text says "Assistant".
```
