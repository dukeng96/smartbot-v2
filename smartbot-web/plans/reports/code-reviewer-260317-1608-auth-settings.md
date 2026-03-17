# Code Review: Auth + Settings Implementation

**Branch:** feat/p3-auth-settings
**Date:** 2026-03-17
**Reviewer:** code-reviewer
**Scope:** 8 modified page files + ~30 new files (types, validations, API, hooks, components, middleware)

---

## Overall Assessment

Solid implementation. Clean separation of concerns: types / validations / API / hooks / components. Vietnamese UI copy correct. Design tokens match spec. Form handling via RHF + Zod is consistent. A few issues need fixing before merge.

---

## Critical Issues

### C1. `proxy.ts` is not connected as Next.js middleware
**File:** `src/proxy.ts`
**Problem:** File is named `proxy.ts` and placed inside `src/`. Next.js expects `middleware.ts` at the project root (or `src/middleware.ts` for src-dir projects). No `middleware.ts` file exists anywhere. The auth route guard is **completely inactive** -- unauthenticated users can access dashboard routes and authenticated users can access auth pages.
**Fix:** Rename to `src/middleware.ts` and export the function as the default middleware:
```ts
// src/middleware.ts
export { proxy as middleware, config } from "./proxy"
```
Or rename `proxy.ts` itself to `middleware.ts` and rename the exported function to `middleware`.

### C2. `usersApi.changePassword` uses same PATCH endpoint as `updateMe`
**File:** `src/lib/api/users-api.ts:22-23`
**Problem:** Both `updateMe` and `changePassword` call `apiPatch("api/v1/users/me", data)`. The backend likely has a dedicated endpoint for password changes (e.g., `POST /api/v1/users/me/password` or `POST /api/v1/auth/change-password`). Sending `{ currentPassword, newPassword }` to a generic PATCH user endpoint will either fail or create a security risk if the endpoint blindly merges fields.
**Fix:** Verify the backend API reference and use the correct password-change endpoint. If it truly is the same PATCH, add a comment explaining why.

### C3. `handleMutationError` blindly casts `error` to `ApiError`
**File:** `src/lib/utils/handle-mutation-error.ts:10`
**Problem:** `const apiError = error as ApiError | undefined` -- ky throws `HTTPError` objects, not plain `ApiError`. The `statusCode` and `message` fields won't be available directly. The handler will always fall through to the generic toast.
**Fix:** Parse the ky error properly:
```ts
export async function handleMutationError(error: unknown) {
  if (error instanceof HTTPError) {
    try {
      const body = await error.response.json() as ApiError
      // use body.statusCode, body.message
    } catch {
      toast.error("Loi ket noi server")
    }
    return
  }
  toast.error("Da xay ra loi. Vui long thu lai.")
}
```
Note: `onError` callbacks in TanStack Query accept sync functions, but if you make this async, wrap the call or handle the promise. Alternatively, add a ky `afterResponse` hook that normalizes errors.

---

## High Priority

### H1. Token refresh race condition on initial page load
**File:** `src/lib/api/client.ts:38-63`
**Problem:** On hard refresh of a protected page, Zustand store starts with `accessToken = null`. Multiple queries fire simultaneously, all get 401, all trigger `handleTokenRefresh`. The dedup via `refreshPromise` is good, BUT `ky(request)` on line 63 re-executes the request -- however this retried request bypasses the `prefixUrl` and creates a raw fetch. Verify this doesn't double-prepend the base URL.
**Fix:** Test with concurrent requests on cold load. Consider using `ky.extend` or passing the original options to the retry.

### H2. `useTeamMembers` / `useInviteMember` hooks accept `tenantId: string | null` then force-unwrap with `!`
**Files:** `src/lib/hooks/use-team.ts:14,24,38,52`
**Problem:** If called when `tenantId` is null and `enabled` is somehow bypassed (React Query quirk or future refactor), these will pass `null!` (i.e., "null") into URL templates, producing `/api/v1/tenants/null/members`.
**Fix:** Add runtime guard:
```ts
if (!tenantId) throw new Error("tenantId is required")
```
inside each `mutationFn`. The query already has `enabled: !!tenantId` which is correct.

### H3. Settings tabs use English labels instead of Vietnamese
**File:** `src/components/features/settings/settings-tabs.tsx:9-11`
**Problem:** Labels are `"Profile"`, `"Workspace"`, `"Team"` -- should be Vietnamese per UI rules: e.g., `"Ho so"`, `"Workspace"`, `"Nhom"`.
**Fix:** Update to Vietnamese labels. "Workspace" can stay as-is since it's a brand/tech term.

### H4. `img` tags lack `next/image` and XSS vector review
**Files:** `src/components/features/settings/profile-form.tsx:68`, `workspace-form.tsx:92`, `team-members-table.tsx:53`
**Problem:** Using raw `<img src={user.avatarUrl}>` with user-controlled URLs. While Next.js `Image` isn't strictly required for external URLs, raw `<img>` tags bypass the image optimization pipeline and don't enforce allowed domains. If `avatarUrl` comes from user input without server-side validation, it could be a tracking pixel or redirect.
**Fix:** Use `next/image` with `remotePatterns` config, or at minimum ensure the backend validates and proxies avatar URLs.

---

## Medium Priority

### M1. `apiDelete` always tries to parse JSON body
**File:** `src/lib/api/client.ts:107`
**Problem:** `apiClient.delete(url).json<ApiResponse<T>>()` -- many DELETE endpoints return 204 No Content with no body. This will throw a JSON parse error.
**Fix:** Handle empty responses:
```ts
export async function apiDelete<T = void>(url: string): Promise<T> {
  const response = await apiClient.delete(url)
  if (response.status === 204) return undefined as T
  const res = await response.json<ApiResponse<T>>()
  return res.data
}
```

### M2. `apiPost` for void responses (`logout`, `forgotPassword`, etc.) parses `res.data`
**File:** `src/lib/api/client.ts:91`
**Problem:** If backend returns `{ statusCode: 200, message: "OK", data: null }`, then `apiPost<void>` returns `null` which is fine. But if backend returns 204 with no body, this will throw.
**Fix:** Same pattern as M1 -- check response status before parsing.

### M3. WorkspaceForm uses inline mutation instead of dedicated hook
**File:** `src/components/features/settings/workspace-form.tsx:32-41`
**Problem:** Other forms use dedicated hooks (useUpdateProfile, useChangePassword), but WorkspaceForm defines its mutation inline. This breaks the consistent pattern.
**Fix:** Create `useUpdateWorkspace(tenantId)` hook in `use-team.ts` or a new `use-tenant.ts`.

### M4. Missing `staleTime` on team members query
**File:** `src/lib/hooks/use-team.ts:12-17`
**Problem:** `useCurrentUser` has `staleTime: 5 * 60 * 1000` but `useTeamMembers` has none. Without staleTime, every focus event refetches the members list.
**Fix:** Add reasonable staleTime (e.g., 60_000).

### M5. Tenant status mapping is incomplete in WorkspaceForm
**File:** `src/components/features/settings/workspace-form.tsx:111`
**Problem:** `tenant.status === "active" ? "active" : "paused"` -- Tenant has 3 statuses: `active | suspended | deleted`. A `suspended` or `deleted` tenant shows as "paused" which is misleading.
**Fix:** Map properly: `active -> active`, `suspended -> paused`, `deleted -> error`.

### M6. DropdownMenuTrigger uses non-standard `render` prop
**File:** `src/components/features/settings/team-members-table.tsx:102`
**Problem:** `<DropdownMenuTrigger render={<Button .../>}>` -- Standard Radix/shadcn DropdownMenuTrigger uses `asChild` prop, not `render`. This may be a custom API but verify it compiles.
**Fix:** If using standard shadcn, change to:
```tsx
<DropdownMenuTrigger asChild>
  <Button variant="ghost" size="icon-sm" aria-label="Tuy chon">
    <MoreVertical className="size-4" />
  </Button>
</DropdownMenuTrigger>
```

---

## Low Priority

### L1. Duplicate GoogleIcon SVG could be further shared
Already extracted to `google-oauth-button.tsx` -- good. No action needed.

### L2. Error validation text uses hardcoded hex `text-[#DC2626]` instead of semantic token
**Files:** All form components
**Problem:** `text-[#DC2626]` appears ~15 times. Could use `text-error` or `text-destructive` if defined in tailwind config.
**Fix:** Define `--error` in tailwind config and use `text-error`.

### L3. `password-strength.ts` level 0 returns empty label but STRENGTH_COLORS[0] is `bg-muted`
**File:** `src/lib/utils/password-strength.ts:6`
**Problem:** If `password` is empty, returns `{ level: 0, label: "" }` but the component already handles `!password` returning null. The `STRENGTH_COLORS[0]` entry is never used. Not a bug, but dead code.

---

## Positive Observations

- Clean component extraction from page files into feature components -- good separation
- Consistent RHF + Zod pattern across all forms
- Proper `useEffect` sync for form reset when props change
- Good `Suspense` wrapping for `useSearchParams` components
- Token refresh deduplication logic in API client
- Proper `isDirty` check to disable save button when no changes
- Vietnamese UI copy is correct and consistent
- Design tokens (colors, spacing, typography) match the spec
- Collapsible change-password section is a nice UX touch
- Empty, loading, error states handled on all settings pages

---

## Recommended Actions (Priority Order)

1. **[C1]** Create `src/middleware.ts` that exports from `proxy.ts` (or rename)
2. **[C3]** Fix `handleMutationError` to properly parse ky `HTTPError` responses
3. **[C2]** Verify/fix the `changePassword` API endpoint path
4. **[H3]** Translate settings tab labels to Vietnamese
5. **[M1/M2]** Handle 204 No Content in apiDelete and apiPost
6. **[H2]** Add runtime guards in mutation functions for null tenantId
7. **[M6]** Verify DropdownMenuTrigger `render` prop or switch to `asChild`
8. **[M5]** Fix tenant status mapping
9. **[M3]** Extract workspace update mutation to a hook
10. **[M4]** Add staleTime to team members query

---

## Unresolved Questions

1. Is there a `backend-api-reference.md` documenting the actual password-change endpoint? (file not found at expected path)
2. Does the ky `afterResponse` hook return the retried response to the original caller, or does it need special handling for the retry flow?
3. Is `DropdownMenuTrigger` using a custom shadcn fork with `render` prop, or should it be `asChild`?
4. Should the middleware also handle `/api/*` routes (e.g., BFF proxy to backend)?
