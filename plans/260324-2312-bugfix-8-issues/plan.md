# Bugfix: 8 Issues (6 UI/API + 2 Failing Tests)

**Created:** 2026-03-24 23:12
**Status:** IMPLEMENTED — pending browser verification

## Summary

Fix 8 issues from QA session: 6 UI/API bugs + 2 failing backend tests.
Workflow: fix → agent-browser verify → fix again if needed.

## Phases

| # | Issue | Type | Severity | Status |
|---|-------|------|----------|--------|
| 1 | Remove dashboard quick action buttons | Frontend | Low | ⬜ |
| 2 | "Tên Assistant" label spacing + text overflow | Frontend | Low | ⬜ |
| 3 | Direct Link card misaligned vs iframe/bubble | Frontend | Low | ⬜ |
| 4 | Remove "Ưu tiên" from KB attach + fix 409 | Frontend+Backend | Medium | ⬜ |
| 5 | KB detail: hide embedding/vector, fix breadcrumb overlap | Frontend | Low | ⬜ |
| 6 | 400 error on conversation messages (limit=200 > max 100) | Backend | High | ⬜ |
| 7 | AuthService.refreshTokens test failure | Backend test | Medium | ⬜ |
| 8 | ChatProxyService.processChat test model mismatch | Backend test | Medium | ⬜ |

## Root Cause Analysis

### Issue 1: Dashboard quick action buttons
**File:** `smartbot-web/src/app/(dashboard)/page.tsx:90-100`
**Fix:** Delete lines 90-100 (the Quick Actions section)

### Issue 2: "Tên Assistant" label too close + text overflow
**File:** `smartbot-web/src/components/features/bots/bot-config-form.tsx:59-65`
**Root cause:** `space-y-1.5` provides only 6px gap between label and input. Text can overflow on long bot names.
**Fix:** Increase spacing to `space-y-2`, add `truncate` to input display if needed

### Issue 3: Direct Link card misalignment
**File:** `smartbot-web/src/components/features/bots/bot-embed-code-section.tsx:14-39`
**Root cause:** Direct Link card uses `lang: "URL"` but same code block layout as HTML cards. The URL is a single line vs multi-line HTML, causing visual mismatch.
**Fix:** For directLink, show as a readonly input field with copy button instead of code block. Or normalize the code block min-height.

### Issue 4: Remove "Ưu tiên" + fix 409 Conflict
**Files:**
- `smartbot-web/src/components/features/bots/bot-kb-attach-dialog.tsx:92-105` — Remove priority field
- `smartbot-web/src/lib/validations/bot-schemas.ts` — Remove priority from attachKbSchema
- `genai-platform-api/src/modules/bots/bots.service.ts:322-328` — The 409 is correct behavior (KB already attached). Frontend should filter out already-attached KBs from the dropdown.
- `smartbot-web/src/components/features/bots/bot-kb-attach-dialog.tsx` — Filter KB dropdown to exclude already-attached KBs

### Issue 5: KB detail — hide fields + fix breadcrumb overlap
**Files:**
- `smartbot-web/src/components/features/knowledge-bases/kb-detail-form.tsx:120-128` — Remove embeddingModel and vectorCollection display
- `smartbot-web/src/app/(dashboard)/knowledge-bases/[kbId]/page.tsx:53-73` — Fix breadcrumb/button overlap. The `PageHeader` uses `flex items-start justify-between` but long KB names push the button off-screen.
**Fix:** Add `min-w-0 flex-1` to title container, `truncate` on title, `shrink-0` on actions button

### Issue 6: 400 on conversation messages (limit=200)
**File:** `genai-platform-api/src/common/dto/pagination.dto.ts:18`
**Root cause:** `@Max(100)` rejects `limit=200`. Frontend sends `limit=200` from conversation detail page.
**Fix:** Change `@Max(100)` → `@Max(1000)` to match documented max. Update API property metadata too.

### Issue 7: AuthService.refreshTokens test
**File:** `genai-platform-api/src/modules/auth/auth.service.spec.ts:234-254`
**Root cause:** Test mock for `refreshTokens` includes `user.memberships[0]` with `tenantId` but no `tenant` object. The service calls `this.sanitizeTenant(membership.tenant)` which gets `undefined`.
**Fix:** Add `tenant: { id: 'tenant-1', name: 'Test', slug: 'test', logoUrl: null, planId: null }` to the membership mock.

### Issue 8: ChatProxy.processChat test model mismatch
**File:** `genai-platform-api/src/modules/chat-proxy/chat-proxy.service.spec.ts:150`
**Root cause:** Test expects `modelUsed: 'mock-gpt-4'` but service uses `modelUsed: 'vnpt-llm'` (line 127 of chat-proxy.service.ts).
**Fix:** Update test expectation from `'mock-gpt-4'` → `'vnpt-llm'`

## Implementation Order

1. **Backend fixes first** (issues 6, 7, 8) — run `npm test` to verify
2. **Frontend fixes** (issues 1, 2, 3, 4, 5) — run `npm run build` to verify
3. **Browser test** via agent-browser to visually verify all 6 UI fixes

## Files to Modify

### Backend
- `genai-platform-api/src/common/dto/pagination.dto.ts` — @Max(100)→@Max(1000)
- `genai-platform-api/src/modules/auth/auth.service.spec.ts` — Add tenant to mock
- `genai-platform-api/src/modules/chat-proxy/chat-proxy.service.spec.ts` — Fix model name

### Frontend
- `smartbot-web/src/app/(dashboard)/page.tsx` — Remove quick action buttons
- `smartbot-web/src/components/features/bots/bot-config-form.tsx` — Fix label spacing
- `smartbot-web/src/components/features/bots/bot-embed-code-section.tsx` — Fix Direct Link card
- `smartbot-web/src/components/features/bots/bot-kb-attach-dialog.tsx` — Remove priority, filter attached KBs
- `smartbot-web/src/lib/validations/bot-schemas.ts` — Remove priority from schema
- `smartbot-web/src/components/features/knowledge-bases/kb-detail-form.tsx` — Hide embedding/vector fields
- `smartbot-web/src/app/(dashboard)/knowledge-bases/[kbId]/page.tsx` — Fix breadcrumb overlap

## Success Criteria

- [ ] `npm test` in backend: 143/143 pass (0 failures)
- [ ] `npm run build` in frontend: 0 errors
- [ ] Agent-browser: all 6 UI fixes visually confirmed
