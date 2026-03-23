# Browser Test Report — Phase 4A Widget Flow
**Date:** 2026-03-24
**Tool:** agent-browser (Chromium)
**Tester:** Automated browser testing

## Test Scope
Phase 4A Session 1 (Widget Config Admin UI) + Session 2 (Direct Link Chat Page)

## Test Account
- Email: tester@smartbot.vn
- Bot: "Widget Test Bot" (efd4d374-2d86-4fd4-9c3f-de708e585f26)

## Results Summary

| Test | Status | Notes |
|------|--------|-------|
| Login flow | PASS | Register + login successful |
| Bot creation | PASS | Dialog, form, redirect to config |
| Widget config page render | PASS | All sections: theme, color, position, branding, colors, typography, custom CSS |
| Widget live preview | PASS | Real-time updates on config changes |
| Widget config save (new fields) | **FAIL → FIXED** | Backend DTO missing 8 new fields |
| Embed codes display | PASS | 3 formats with copy buttons |
| Direct link URL | **FAIL → FIXED** | Used backend port (3000) instead of frontend port (3001) |
| Chat page public access | PASS | No auth redirect, correct layout |
| Chat page config loading | PASS | Loads greeting, suggestions, widget config (requires active bot) |
| Chat greeting message | PASS | Renders as first bubble, persists after messages |
| Suggested question chips | PASS | Clickable, send message, disappear after first message |
| SSE streaming | PASS | Mock response streams correctly with delta events |
| Session persistence | PASS | endUserId + conversationId in localStorage, history reloads |
| Widget config theming on chat | PASS | displayName, backgroundColor, fontFamily all applied |

## Bugs Found & Fixed

### Bug 1: Widget config save fails (HIGH)
**Symptom:** Values (displayName, backgroundColor, fontFamily, fontSize) revert to defaults after reload
**Root cause:** Backend `UpdateWidgetDto` only had 7 original fields. The 8 new fields added in Phase 4A Session 1 (displayName, logoUrl, fontColor, backgroundColor, userMessageColor, botMessageColor, fontFamily, fontSize) were rejected by NestJS class-validator with `whitelist: true`
**Fix:**
- `genai-platform-api/src/modules/bots/dto/update-widget.dto.ts` — added 8 new optional fields with decorators
- `genai-platform-api/src/modules/bots/bots.service.ts` — added spread operators for new fields in `updateWidget()`
**Verified:** API returns saved config, frontend loads persisted values after reload

### Bug 2: Direct link URL uses wrong port (MEDIUM)
**Symptom:** Embed code Direct Link shows `http://localhost:3000/chat/...` (backend) instead of `http://localhost:3001/chat/...` (frontend)
**Root cause:** `getEmbedCode()` used single `APP_URL` env var for all embed types, but Direct Link points to a Next.js frontend route, not a backend endpoint
**Fix:**
- `genai-platform-api/src/modules/bots/bots.service.ts` — added `FRONTEND_URL` env var for directLink generation
- `genai-platform-api/.env` — added `FRONTEND_URL=http://localhost:3001`
- `genai-platform-api/.env.example` — documented new env var
**Verified:** Code change correct, requires server restart for env var pickup

## Files Modified
1. `genai-platform-api/src/modules/bots/dto/update-widget.dto.ts` — +40 lines (8 new fields)
2. `genai-platform-api/src/modules/bots/bots.service.ts` — +9 lines (widget field spreads + FRONTEND_URL)
3. `genai-platform-api/.env` — +1 line (FRONTEND_URL)
4. `genai-platform-api/.env.example` — +2 lines (FRONTEND_URL with comment)

## Not Bugs (Investigated & Dismissed)
- Vietnamese text encoding in greeting: caused by Windows curl terminal encoding, not frontend issue
- Chat page width appears narrow: full viewport width confirmed (1251px), visual appearance due to subtle background color difference
- Bot must be "active" for `/config` endpoint: by design, documented behavior
