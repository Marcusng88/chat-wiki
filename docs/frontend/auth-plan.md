# Auth Implementation Plan

Status: Ready for Implementation
Date: 2026-05-27

---

## Decisions

| Decision | Choice |
|---|---|
| Route protection | Next.js `middleware.ts` |
| Supabase client | `@supabase/ssr` (browser + server clients) |
| Sign-up | `/sign-up` page (email + password) |
| Email confirmation | Disabled in Supabase dashboard |
| Forgot password | `/reset-password` + `/update-password` pages |
| OAuth callback | `/auth/callback` route handler |
| Session access | Real Supabase session replaces `MOCK_USER_ID` |

---

## Files

### 1. Install
```bash
pnpm add @supabase/ssr
```

---

### 2. `frontend/lib/supabase.ts` (replace)

Replace current basic client with SSR-aware clients:

- `createBrowserClient()` — for `'use client'` components
- `createServerClient(cookieStore)` — for middleware + server components

---

### 3. `frontend/middleware.ts` (new)

- Runs on every request (matcher: all except `_next/static`, `_next/image`, `favicon.ico`)
- Public routes: `/sign-in`, `/sign-up`, `/reset-password`, `/update-password`, `/auth/callback`
- Unauthenticated request to protected route → redirect to `/sign-in`
- Authenticated request to `/sign-in` or `/sign-up` → redirect to `/`
- Refreshes session cookie on every request (Supabase SSR requirement)

---

### 4. `frontend/app/auth/callback/route.ts` (new)

GET handler:
- Reads `code` from search params
- Calls `supabase.auth.exchangeCodeForSession(code)`
- Redirects to `/` on success, `/sign-in?error=auth` on failure
- Required for: Google OAuth redirect + password reset link

---

### 5. `frontend/app/sign-up/page.tsx` (new)

- Email + password fields (same design system as sign-in)
- Calls `supabase.auth.signUp({ email, password })`
- On success → redirect to `/` (email confirmation disabled)
- Error handling: "Email already in use", generic fallback
- Link back to `/sign-in`

---

### 6. `frontend/app/reset-password/page.tsx` (new)

- Email field only
- Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/auth/callback?next=/update-password' })`
- Shows confirmation message after submit (no redirect)
- Link back to `/sign-in`

---

### 7. `frontend/app/update-password/page.tsx` (new)

- Protected route — only reachable via password reset link (Supabase sets session from URL hash)
- New password field + confirm password field
- Calls `supabase.auth.updateUser({ password })`
- On success → redirect to `/`

---

### 8. `frontend/lib/auth.ts` (replace)

Replace mock with:
- `getSession()` — returns current session or null (server-side helper)
- `getUserId()` — returns `user_id` string or null
- `getAuthHeader()` — returns `{ Authorization: 'Bearer <token>' }` for FastAPI calls

---

### 9. `frontend/app/sign-in/page.tsx` (update)

- Wire "Create an account" `href` → `/sign-up`
- Wire "Forgot password?" `href` → `/reset-password`

---

### 10. `frontend/app/page.tsx` (update)

- Remove `MOCK_USER_ID` dependency
- Read real session via `getSession()` / client-side `supabase.auth.getUser()`
- `user_id` available for all FastAPI calls
- Dev mock documents can stay for now (backend not wired yet)

---

## Route Map

| Route | Auth required | Notes |
|---|---|---|
| `/` | Yes | Main app |
| `/sign-in` | No (redirect if authed) | |
| `/sign-up` | No (redirect if authed) | |
| `/reset-password` | No | |
| `/update-password` | Session from reset link | |
| `/auth/callback` | No | Code exchange handler |

---

## Supabase Dashboard Settings

Before testing:
1. Disable email confirmation: Auth → Settings → Email → uncheck "Confirm email"
2. Add Google OAuth provider: Auth → Providers → Google (client ID + secret)
3. Add redirect URL: `http://localhost:3000/auth/callback` (and prod URL when deploying)

---

## Env Vars Required

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Both already referenced in `lib/supabase.ts`.
