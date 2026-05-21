# Corkboard TODO

Derived from the architectural review. Ordered roughly by priority — auth/authz first, then real-time correctness, then hygiene.

## Critical security

### 1. Per-board authorization layer ✅
- ~~Add `assertBoardMember(userId, boardId)` server helper.~~
- ~~Use it in every loader/action: `board.$boardId.tsx`, `board_item.$boardItemId.tsx`, and any future board-scoped route.~~
- ~~For `board_item` mutations, resolve item → board → membership before allowing the write.~~
- ~~Return `404` on miss (not `403`) so existence isn't leaked.~~

Implemented in `app/.server/authz.ts` (`assertBoardMember`, `assertBoardItemAccess`). Wired into `routes/board.$boardId.tsx` (loader + action, with `board.id` forced from URL params) and `routes/board_item.$boardItemId.tsx` (all three methods). Open follow-ups:
- SSE membership check (covered by #6).
- Integration tests (covered by #16).

### 2. Session cookie hardening ✅
- ~~Read `SESSION_SECRET` from env (require at boot); pass to `createCookieSessionStorage({ cookie: {...}, secrets: [...] })`.~~
- ~~Remove hardcoded `domain: 'localhost'`; drive from env.~~
- ~~`secure: process.env.NODE_ENV === 'production'`, explicit `sameSite: 'lax'`.~~
- ~~Shorten lifetime to ~2h with rolling refresh on activity.~~

Implemented in `app/.server/session.ts`. `SESSION_SECRET` is required at boot (`throw` if missing). `COOKIE_DOMAIN` is optional env-driven. `secure` follows `NODE_ENV`, `sameSite: 'lax'`, `maxAge: 2h`. `verifySession` now returns `{ session, headers }` — every authenticated loader/action returns those headers, so the cookie is re-emitted with a fresh `Set-Cookie` on every request (rolling refresh). `sse.ts` now requires a session (full per-board membership scoping still pending under #6). `.env.example` added; `compose.yaml` requires `SESSION_SECRET` at startup.

Open follow-ups:
- Server-side session revocation list (DB-backed, for "logout everywhere") — defer into #4 since the SSO rewrite touches session handling and identity. Track there.

### 3. CSRF protection ✅
- ~~Add CSRF token to session, verify on every non-GET action.~~
- ~~Or switch JSON `fetch` mutations to Remix `<Form>` + same-origin/`Sec-Fetch-Site` check middleware.~~

Implemented as a Fetch-Metadata-style origin check (chosen over the remix-utils CSRF helper because that helper assumes FormData; our mutation surface is JSON). `app/.server/csrf.ts` exports `assertSameOrigin(request)`:
- Allows safe methods (`GET`, `HEAD`, `OPTIONS`).
- If `Sec-Fetch-Site` is present: allow only `same-origin` and `none`; reject `same-site` and `cross-site`.
- If `Sec-Fetch-Site` is absent (old browser fallback): require `Origin` host to match request host; reject if missing or mismatched.

Wired into `verifySession` (covers every authenticated mutation) and the two unauthenticated mutation routes (`login`, `create_user`). Client fetches in `board.$boardId.tsx` now set `Content-Type: application/json` + `credentials: 'same-origin'` via a small `jsonFetch` helper — sets up CORS preflight as an extra layer if a cross-origin call were ever attempted.

Stacks on top of `SameSite=Lax` + signed session cookie from #2, so cross-site state-changing requests are blocked at the cookie layer, the header layer, and (for cross-origin XHR) by CORS preflight.

### 4. Replace local login with multi-provider SSO ✅
Rip out the existing email/password login entirely (no migration path needed — pre-launch).
Build a provider-agnostic OIDC layer so adding new IdPs (Microsoft, GitHub, Okta, etc.) is a config-only change.

**Implemented.** Schema migrated (`prisma/seed.sql` + `prisma/schema.prisma`): dropped `user.salt` and `user.password_hash`, added `user_identity` table with unique `(provider, provider_user_id)`. `.server/user.ts` rewritten with `getUserById` + `upsertUserFromIdentity` (atomic, refuses to merge an existing email-matched user without an existing linked identity). New `app/.server/auth/` with `providers.ts` (env-driven registry; Google is the first impl) and `oidc.ts` (per-provider `openid-client` cache + PKCE/state/nonce flow cookie). New routes `auth.$provider.tsx` (POST, CSRF-checked, returns redirect to IdP with flow cookie) and `auth.$provider.callback.tsx` (GET from IdP, verifies state/nonce, validates `email_verified` + hosted-domain + allowed-email-domains, upserts identity, sets session). `routes/login.tsx` now lists configured providers; `routes/create_user.tsx` and the `CreateUser*` components are deleted. `Login` component renders a button per provider. `.env.example` + `compose.yaml` updated with the new env contract.

**User must do before this can be tested:**
1. Register an OAuth 2.0 Web Application client in Google Cloud Console.
2. Add `${AUTH_CALLBACK_BASE_URL}/auth/google/callback` as an authorized redirect URI (e.g. `http://localhost:5174/auth/google/callback` for dev, plus the production URL).
3. Copy client id + secret into `.env`.
4. Set `AUTH_CALLBACK_BASE_URL` to the base URL the browser uses to reach this app (no trailing slash).
5. Recreate the database so the new schema takes effect: `docker compose down && docker volume rm corkboard_db && docker compose up db && npx prisma generate`.
6. Optional: set `GOOGLE_HOSTED_DOMAIN` to restrict to a Workspace domain, or `ALLOWED_EMAIL_DOMAINS` for a cross-provider allowlist.

**Carry-overs (originally rolled into #4):**
- Server-side session revocation list (DB-backed). Not yet implemented — sessions are still pure cookie-payload. Adding a `session` table with a `sid` claim in the cookie is straightforward but unblocks no current threat; deferred behind #5 (input validation) and #6 (per-board SSE).
- Rotate session ID on login. Cookie payload is rotated on every login (we always issue a fresh `Set-Cookie` after upsert), but there is no server-side session ID to invalidate, so true fixation-resistance also depends on the revocation work above.

Original spec retained below for reference.

**Schema changes**
- Drop `user.salt` and `user.password_hash`.
- Add `user_identity` table:
  - `id UUID PK`
  - `user_id UUID FK -> user(id)`
  - `provider VARCHAR(32)` — `'google'`, `'microsoft'`, …
  - `provider_user_id VARCHAR(255)` — the `sub` claim from the IdP
  - `email VARCHAR(256)` — email at the IdP at time of last login (for display/audit)
  - `created_at`, `updated_at`
  - `UNIQUE(provider, provider_user_id)`
- One user can have multiple identities (link multiple IdPs to one account later).
- Keep `user.email` and `user.name` as canonical profile fields, populated from the first identity.

**Code layout**
- `app/.server/auth/` directory
  - `providers.ts` — registry: `{ google: GoogleProvider, microsoft: MicrosoftProvider, ... }`. Each provider exports `{ id, label, authorize(req), callback(req): NormalizedProfile }`.
  - `oidc.ts` — shared OIDC client setup (use `openid-client` lib — handles state, nonce, PKCE, JWT validation correctly).
  - `session.ts` — existing session module, takes a `user_id` after successful provider callback.
- Routes
  - `routes/auth.$provider.tsx` — initiates the flow (`/auth/google` redirects to Google).
  - `routes/auth.$provider.callback.tsx` — handles the IdP redirect, validates state/nonce, upserts `user_identity`, sets session.
  - Delete `routes/create_user.tsx`. Users are auto-provisioned on first successful SSO callback.
  - Reduce `routes/login.tsx` to a list of "Sign in with X" buttons rendered from the provider registry.
- Drop `.server/user.ts` `createUser`, `login`, `hashPassword`, `generateSalt`. Keep `getUserByEmail` (and add `getUserById`, `upsertUserFromIdentity`).

**Provider config**
- Env-driven so providers can be enabled/disabled per deployment:
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` (future)
  - `AUTH_CALLBACK_BASE_URL` (single base; each provider derives its own callback path)
- Provider registry only registers providers whose env vars are set. The login page renders whatever's registered.

**Security requirements**
- Use `openid-client` (don't hand-roll OAuth). It handles state, nonce, PKCE, JWKS rotation, ID-token signature/claims validation.
- Require `email_verified: true` from the IdP before provisioning a user — prevents takeover via unverified email at the provider.
- Identity linking by email: only allow if the existing user has at least one already-linked identity with the same verified email. Never auto-merge based on a brand-new identity's email alone.
- Optional: restrict to specific email domains via `ALLOWED_EMAIL_DOMAINS` env, and (for Google) the `hd` parameter for hosted-domain workspaces.
- Rotate session ID on login (prevents session fixation).
- Server-side session revocation: add a `session` table (`{id, user_id, created_at, last_used_at, revoked_at}`) with a session-id claim in the cookie. Check on every authenticated request. "Logout everywhere" = revoke all sessions for a user. Deferred from #2 because the SSO rewrite is the natural place to introduce it.

**Migration**
- Pre-launch: drop the old `user.salt` / `user.password_hash` columns in a single migration alongside the new `user_identity` table.
- Update `prisma/seed.sql` and `schema.prisma`.

### 5. Input validation at action boundaries ✅
- ~~Add `zod` (or `valibot`) schemas for every action body.~~
- ~~Never trust IDs from the body — always derive target from URL `params`.~~
- ~~Allowlist mutable fields per mutation (no mass-assignment from `board` object).~~
- ~~Cap `board_item.content` length (e.g., 4 KB).~~

Implemented in `app/.server/validate.ts`. zod schemas + `parseJson` / `parseFormData` helpers that throw `Response(400)` on invalid input. Wired into every mutation surface: board POST/PUT, board_item POST/PUT, create_board (formData), auth.$provider initiate (formData). Board update path refactored — `updateBoard(id, data)` now takes id + an allowlisted `{name, background_color}` so even with mass-assignment in the body, only those fields can land in the DB. `updateBoardItem` signature now honestly types its `null`-skip behavior. Sticky note content capped at 4096 chars; positions must be finite numbers; colors must be `#RRGGBB`; emails validated by zod.

### 6. Per-board SSE channels ✅ (partial)
- ~~Namespace events as `board:${boardId}:items` / `board:${boardId}:meta`.~~
- ~~`/sse?boardId=…` subscribes only to events for boards the user belongs to (membership check in SSE loader via `assertBoardMember`).~~

Implemented. `services/emitter.server.ts` exports `itemsChannel(boardId)` / `metaChannel(boardId)` helpers and disables the EventEmitter max-listener warning. `/sse` now requires a `boardId` query param, runs `assertBoardMember`, and subscribes only to that board's two channels. Emit sites in `board.$boardId.tsx` (POST/PUT) and `board_item.$boardItemId.tsx` (POST/PUT/DELETE) are scoped to the affected board; `assertBoardItemAccess` now has its return value (board_id) captured and used. Client side: `useEventSource` calls pass `/sse?boardId=...` and listen on `items` / `meta` event types.

Open follow-ups:
- **Disconnect on membership removal.** Currently a removed user keeps a stale SSE connection open until reconnect. Needs an out-of-band signal (e.g., emit a `revoke` event on the user's connection when they're removed) — tracked here.
- **Replace in-process `EventEmitter` with Postgres `LISTEN/NOTIFY`** (or Redis pub/sub). Required for >1 Node instance; the current setup is single-process only. Tracked here.

### 7. Replace silent member-add with invitation flow ✅
- ~~`createBoardUser` currently joins users silently by email — replace with invite tokens + pending state + accept/decline.~~
- ~~Return same response whether email exists or not (no user enumeration).~~
- ~~Only board members/owners can invite.~~
- ~~Validate email format at invite time (the IdP handles validation for self-signup post-#4).~~

Implemented. New `board_invite` table (`prisma/seed.sql` + `prisma/schema.prisma`) with token, optional email, invited_by, accepted_at, expires_at. `.server/invite.ts` exports `createInvite` (random 32-byte base64url token, 7-day TTL), `getInviteByToken`, `isInviteRedeemable`, and `acceptInvite` (transactional: idempotent for already-member, un-soft-deletes if previously removed). New `routes/invite.$token.tsx`: loader redirects to `/login?returnTo=/invite/$token` when unauthenticated, otherwise shows an accept form; action runs `acceptInvite` and redirects to the board. `routes/login.tsx` and the `Login` component now thread `returnTo` through to provider Forms; `auth.$provider.tsx` already honored it, so the full round-trip works. `board.$boardId.tsx` POST: when `addBoardUser` is set, creates an invite and returns `{ board, inviteUrl }`; the settings modal displays the link for the inviter to share. `createBoardUser` deleted from `.server/board_user.ts` — no callers remain. No enumeration: the same code path runs whether or not the email already exists in the system.

### 8. Security headers + XSS hardening ✅ (partial)
- ~~Strict-Transport-Security, X-Content-Type-Options: nosniff, Referrer-Policy: same-origin, X-Frame-Options: DENY.~~
- ~~Audit BoardItem and any markdown/rich-text rendering for dangerouslySetInnerHTML.~~

**XSS found and fixed.** `BoardItem` was assigning sticky-note `content` directly to `.innerHTML` (not `dangerouslySetInnerHTML`, but the equivalent DOM API), and reading user input via `.innerHTML`. Any user-typed `<script>` or `<img onerror>` would round-trip through the DB and execute in every other member's browser. Switched all sides to `.textContent` and added `whitespace-pre-wrap break-words` so newlines still render. Sticky notes are now strictly plain text — formatting features will need a sanitizer (DOMPurify) when added later.

**Headers.** `entry.server.tsx` now sets `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY` on every response. In production it also sets `Strict-Transport-Security: max-age=31536000; includeSubDomains` and a CSP locking down default/script/style/img/connect/font/frame-ancestors/base-uri/form-action/object.

Open follow-up:
- **CSP nonce for scripts.** Current CSP allows `script-src 'self' 'unsafe-inline'` because Remix injects an inline hydration `<script>window.__remixContext = ...</script>`. To remove `'unsafe-inline'`, plumb a per-request nonce via `AsyncLocalStorage` from `entry.server.tsx` into `<Scripts nonce={...}>` in `root.tsx`, then switch the CSP to `script-src 'self' 'nonce-{nonce}' 'strict-dynamic'`. Defer-tracked here.

### 9. Fail closed in loaders ✅
- ~~`.server/board.ts:getBoardById` currently swallows errors and returns `null` — let errors propagate to Remix error boundary.~~
- ~~Audit other `.server/*` modules for similar swallow-and-return-null patterns.~~

Removed the try/catch from `getBoardById` so Prisma errors propagate to Remix's error boundary instead of being masked as "board not found". Audited the rest of `.server/*` — remaining catches in `csrf.ts`, `validate.ts`, `oidc.ts`, and `auth/oidc.ts` either re-throw an explicit `Response` or invalidate cache state before re-throwing, which is correct fail-closed behavior. The board route loader was already fixed under #1.

### 10. Rate limiting ✅
- ~~Per-IP on the SSO callback (`/auth/$provider/callback`) to mitigate callback flooding.~~
- ~~Per-user on board mutation endpoints (item create/update/delete) to prevent runaway clients or abuse.~~
- ~~Per-IP on `/sse` subscribe to limit connection-exhaustion attacks.~~

In-memory fixed-window rate limiter at `app/.server/rate-limit.ts`. HMR-safe (state on `globalThis`); cleanup interval prunes expired buckets every minute. Uses `remix-utils/get-client-ip-address` (which knows the standard proxy headers). Applied: auth callback at 20/min/IP, board_item mutations at 120/min/user (~2/sec to accommodate drag debounce + typing), `/sse` subscribe at 30/min/IP. Returns 429 with `Retry-After`.

Open follow-up: this is in-process only — once we run >1 node instance, swap to Redis or a token-bucket service. Tracked under #19 (horizontal scaling readiness).

## Real-time / efficiency

### 11. Surgical SSE payloads (no full revalidate) ✅
- ~~Send the changed object in the SSE event (`{ type: 'item.updated', item: {...} }`).~~
- ~~Update local React state directly; reserve `revalidate()` for membership changes.~~

`emitter.emit(channel, payload)` now carries typed events. Items channel: `{ type: 'item.created' | 'item.updated' | 'item.deleted', item|itemId }`. Meta channel: still triggers `revalidate()` since membership and board metadata changes are rare and small. SSE route forwards the payload as stringified JSON. Client converted `boardItems` from a derived `loaderData` constant to React state; surgical handlers apply create/update/delete based on the SSE event type. Local mutations also update state optimistically before the SSE echo lands. Server-side board-item drag updates that used to trigger a full loader-refetch+rerender across all clients now mutate one item by id.

### 12. Debounce drag writes ✅ (with open enhancement)
- ~~Throttle/debounce drag updates client-side (~150ms) or persist only on drop.~~

Confirmed already in place: `react-draggable` is wired only to `onStop`, so position writes are once-per-drag. Text content and color updates in `BoardItem` debounce with `DEBOUNCE_SETTIMEOUT_LENGTH=500ms`; board background color in `board.$boardId.tsx` debounces the same way. With surgical SSE payloads (#11), each write produces exactly one per-item DB row update + one SSE message per board member.

Open enhancement (not strictly debounce, but related):
- **Presence channel for live drag visibility.** Currently other users see a sticky's new position only after release. To show in-flight drag movement, add a separate WebSocket-or-SSE "presence" channel that broadcasts cursor/position without persisting. Out of scope for the security/efficiency pass; tracked here.

### 13. PrismaClient singleton ✅
- ~~Replace per-file `new PrismaClient()` with a single shared `app/.server/db.ts` exporting a memoized client.~~

Done. New `app/.server/db.ts` exports a shared `prisma` instance, stashed on `globalThis` in non-production so Vite HMR doesn't accumulate connection pools. Updated all six `.server/*` files (`board.ts`, `board_item.ts`, `board_user.ts`, `user.ts`, `authz.ts`, `invite.ts`) to import from `./db` instead of constructing their own.

### 14. Collapse N+1 in board loader ✅
- ~~`board.$boardId.tsx` loader does three sequential awaits — combine into one Prisma query.~~

New `getBoardWithItemsAndUsers(boardId)` does a single `board.findUnique` with nested includes for non-deleted `board_item` and non-deleted `board_user` (with user joined). Loader now does two queries total: `assertBoardMember` (1) + `getBoardWithItemsAndUsers` (1). Was 4 (assert + board + items + users).

### 15. Add missing indexes ✅
- ~~`board_item(board_id)`, `board_user(board_id)`.~~
- ~~`user_identity(user_id)`, `user_identity(provider, provider_user_id)` (unique).~~

Added in `seed.sql` and `schema.prisma`: `board_item(board_id)`, `board_user(board_id)`. `board_user(user_id)` is covered by the existing composite PK `(user_id, board_id)` — Postgres uses the leftmost-prefix when querying by `user_id` alone. `user_identity(user_id)` and `user_identity(provider, provider_user_id)` already existed from #4. `board_invite(board_id)` was added with #7.

### 16. Decide on soft-delete ✅ (decision recorded, action deferred)
**Decision: keep `is_deleted`.**
- All read paths already filter `is_deleted = false` (`assertBoardMember`, `getBoardUsersByBoardId`, `getBoardWithItemsAndUsers`, `getBoardItemsByBoardId`). The plumbing is consistent.
- The accept-invite path already un-soft-deletes a previously removed user (`acceptInvite` in `.server/invite.ts`).
- `board` itself has no `is_deleted` column and doesn't need one yet.

**Deferred:** there's no UI / action that sets `board_user.is_deleted = true`. A `POST /board/$boardId/members/$userId/remove` action gated on board ownership is straightforward — defer until removing-members becomes a product need. When added, also: emit a meta SSE event to close the removed user's active SSE connection (open follow-up under #6).

## Architecture / hygiene

### 17. Authorization integration tests ✅
- ~~Vitest suite with a containerized Postgres.~~

`test/authz.test.ts` runs against a real Postgres (the existing compose `db` container, separate `db_corkboard_test` database — recreated on each `npm test`). 10 tests, ~1.3s end-to-end:
- non-member cannot read another board (404)
- member can read their board (200)
- non-member cannot POST-update a board (404)
- **body-supplied `board.id` cannot override URL `params.boardId`** — verified that boardB is unchanged when its id is smuggled in the body of a POST to boardA
- non-member cannot create board items on another board (404)
- non-member cannot update another board's item (404)
- removed member loses access immediately (soft-delete + reread → 404)
- non-member cannot subscribe to a board's SSE channel (404)
- unauthenticated request redirects to `/login`
- cross-site mutation (`Sec-Fetch-Site: cross-site`) is rejected (403)

`vitest.config.ts` runs file-serially (single Postgres) and loads env vars (`SESSION_SECRET`, `AUTH_CALLBACK_BASE_URL`, test `DATABASE_URL`) before workers start. Helpers in `test/helpers.ts`: `createTestUser`, `createTestBoard`, `addBoardMember`, `createTestBoardItem`, `buildAuthedRequest`, `expectResponseStatus`. Scripts: `npm test`, `npm run test:watch`.

### 18. Structured logging + audit trail ✅ (partial)
- ~~Add `board_audit` table for create/delete/add-member/remove-member events.~~
- ~~Structured (JSON) logs via `pino`.~~

`board_audit` table added (`prisma/seed.sql` + `prisma/schema.prisma`): `id, board_id, actor_user_id, action, details (JSONB), created_at`. Indexed on `board_id` and `created_at DESC` for "most-recent-events" queries. `app/.server/audit.ts` exports `recordAudit({boardId, actorUserId, action, details, tx?})` — accepts an optional transaction client so audit + state change happen atomically. Wired into:
- `createBoard` → `board.created` (in-transaction)
- `board.$boardId.tsx` POST/PUT → `board.updated`
- `createInvite` → `member.invited`
- `acceptInvite` → `member.joined` (in-transaction)

`app/.server/log.ts` exports a `pino` logger. Pretty-printed in dev (`pino-pretty`), JSON in production, silent in tests. Replaced `console.error` in `entry.server.tsx` and `board_item.$boardItemId.tsx` with structured `log.error`. The `recordAudit` helper also emits an `audit: true` log line so a single grep finds every governance event.

Open follow-up:
- **Per-request request ID** for log correlation. Needs `AsyncLocalStorage` in `entry.server.tsx` to plumb a UUID into every loader/action log. Same plumbing as the CSP nonce follow-up under #8.
- More audit hooks (`board_item.created/deleted`) only if we end up wanting an audit feed UI — high volume, may bloat the table.

### 19. Horizontal scaling readiness — deferred
**Decision: stay single-instance for now.** A single Node process is sufficient for the team-retro use case. Revisit if usage grows.

When revisiting, two things need to move off in-process state:
1. **SSE pub/sub.** `services/emitter.server.ts` is a `node:events` EventEmitter — won't fan out across instances. Replace with Postgres `LISTEN/NOTIFY` (no new infra) or Redis pub/sub.
2. **Rate-limit counters.** `app/.server/rate-limit.ts` keeps buckets on `globalThis` — needs to move to Redis (`INCR`+`EXPIRE`) or a Postgres counter table.

Also when scaling out:
- Add a `/healthz` endpoint for the orchestrator.
- Move OIDC client cache (`oidc.ts`) — currently per-process; reasonable to keep per-process even multi-instance.
- Verify session cookie behavior — already stateless (signed payload), so no shared session store needed.

## Future / lower priority

### 20. Board customization features
- Background image / pattern, not just color.
- Sticky note categories / columns (typical retro layout: "went well / didn't / actions").
- Templates per team.

### 21. Member roles
- Owner / editor / viewer rather than flat membership.
- Affects authz helper signature (`assertBoardRole(userId, boardId, minRole)`).
