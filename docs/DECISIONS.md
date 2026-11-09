# ORBIX â€” Architecture Decision Records (ADR)

## ADR 001: Core Architecture & Tech Stack Selection
- **Status:** Accepted
- **Context:** Building ORBIX, a real-time messaging platform prioritizing performance, strict type safety, clean reactive UI, and robust security.
- **Decision:**
  - **Frontend:** Vite + React + TypeScript (strict) + React Router (lazy-loaded routes).
  - **Styling & UI:** Tailwind CSS, shadcn/ui design tokens, Lucide React, Motion for React (framer-motion).
  - **State Management:** Zustand for UI and session client state only. TanStack Query for all server state. Strictly avoid duplicating server data in Zustand.
  - **Forms & Validation:** React Hook Form + Zod.
  - **Backend & Auth:** Supabase (PostgreSQL, Supabase Auth, Realtime, Storage, Edge Functions).
  - **Testing:** Vitest, React Testing Library, Playwright for E2E.
- **Consequences:** Eliminates unnecessary framework overhead (no SSR/Next.js needed for this client-first real-time platform), ensures single source of truth for caching via TanStack Query.

## ADR 002: Realtime Strategy & Channel Topology
- **Status:** Accepted
- **Context:** Realtime messaging, typing indicators, and presence tracking require distinct latency and durability guarantees.
- **Decision:**
  - **Postgres Changes:** Used for message `INSERT`, `UPDATE`, `DELETE` scoped to conversations the authenticated user belongs to.
  - **Broadcast:** Used for ephemeral typing indicators (debounced, TTL-backed) without database writes.
  - **Presence:** Used for online/idle tracking per user session without writing high-frequency heartbeats to disk.
- **Consequences:** Low database load, zero database churn for typing indicators, strict RLS enforcement for message payloads.

## ADR 003: Idempotent Message Identity & Cursor Ordering
- **Status:** Accepted
- **Context:** Reliable message sending, optimistic updates, and preventing duplicate messages during network retries.
- **Decision:**
  - Client generates a UUID `client_id` per message attempt.
  - Server maintains a monotonically increasing per-conversation `seq` integer alongside `created_at`.
  - Pagination uses cursor-based queries on `seq` (`DESC` for history, `ASC` for catching up).
- **Consequences:** Eliminates duplicate bubbles on network retry/echo, gives rock-solid pagination stability even when messages arrive concurrently.

## ADR 004: Unread Message Count Computation
- **Status:** Accepted
- **Context:** Computing unread messages efficiently without costly full-table receipt scans.
- **Decision:**
  - Unread counts are computed comparing the user's `last_read_message_id` (or `last_read_seq`) on `conversation_members` against the conversation's latest `seq`.
- **Consequences:** High-performance, constant-time unread calculation per conversation.

## ADR 005: Case-Insensitive Database-Enforced Unique Usernames
- **Status:** Accepted
- **Context:** Ensuring users cannot register duplicate usernames under varying case or whitespace permutations (e.g. `sheran` vs `Sheran` vs `SHERAN`).
- **Decision:**
  - Created unique PostgreSQL index `profiles_username_unique` on `LOWER(TRIM(username))`.
  - Enforced format check `^[a-zA-Z0-9_]{3,30}$` and reserved system handle blacklist.
  - Implemented pre-flight availability checks in `profileService` and translated database constraint conflicts into user-friendly error messages.
- **Consequences:** Permanent prevention of duplicate handles, deterministic user identity across the platform.

## ADR 006: Username-Only Discovery Architecture
- **Status:** Accepted
- **Context:** User privacy and discovery hygiene; preventing display name collisions or exposing user emails.
- **Decision:**
  - Restricted user discovery, add contact, and new chat search to query exclusively on `profiles.username` using ILIKE queries.
  - Omitted email columns from discovery endpoints entirely.
  - Stripped `@` prefix automatically to handle natural handles like `@sheran`.
  - Formatted search results to display `@username` prominently as the primary key with display name as secondary info.
- **Consequences:** Zero private email exposure, predictable handle-based discovery.

## ADR 007: Public Guest Mode & Immutable Administrative Core
- **Status:** Accepted
- **Context:** Permitting public visitors to preview the live application layout without forced login, while maintaining absolute security on protected mutations, and providing administrative control.
- **Decision:**
  - Root path `/` directly mounts the normal ORBIX messaging shell in guest mode.
  - Interceptors prompt a sleek `AuthModal` whenever unauthenticated guests attempt protected actions (message sending, file upload, reactions, new chats, contacts, groups).
  - Built `/admin` protected by `RequireAdmin` guard and server-side RBAC validation.
  - Implemented atomic daily registration limiter with concurrency-safe database counter and invite-only capabilities.
  - Structured immutable `audit_logs` protected by PostgreSQL RLS with `UPDATE (false)` and `DELETE (false)`.
- **Consequences:** High visitor conversion, zero data exposure to unauthenticated sessions, enterprise-grade administrative governance.

## ADR 008: Comprehensive Authentication Repair, Session Lifecycle & Environment Hardening
- **Status:** Accepted
- **Context:** Authentication encountered initialization failures, race conditions between `getSession` and `onAuthStateChange`, unhandled email verification states, missing confirm password validation, and security risks in environment variable exposure.
- **Decision:**
  - **Single Auth Authority in AuthContext:** Unified session lifecycle exclusively under `supabase.auth.onAuthStateChange`, eliminating duplicate concurrent `loadUserData` triggers and race conditions with premature `isLoading = false`.
  - **Self-Healing Profiles & Settings:** Implemented resilient profile creation fallback (`ensureProfile`) if the database trigger is delayed or partially fails. Added RLS `INSERT` policy for `profiles` with `WITH CHECK (id = auth.uid())`.
  - **Public Safe RPC for Username Check:** Created `check_username_available(TEXT)` security definer function granted to `anon` and `authenticated` roles, returning solely boolean availability to permit unauthenticated registration availability verification without exposing table data or weakening RLS.
  - **5-Field Registration & Strict Validation:** Added `confirmPassword` input, email regex formatting, >=8-character password strength requirements with character mix, and normalization before submission.
  - **Email Verification & Callback Architecture:** Created dedicated `/auth/callback` handler to capture tokens, parse error states (e.g. `otp_expired`), and route confirmed accounts directly to `/app/chats`. Added resend verification email flow across registration and login interfaces.
  - **Password Recovery Hardening:** Added active session/token detection in `ResetPasswordPage` to prevent "Auth session missing" crashes, invalid/expired link detection with recovery dispatch, and confirm password checks.
  - **Environment Hardening:** Isolated sensitive secrets into `.env.local` (Git-ignored) and sanitized `.env.example` with strict placeholders to prevent committing live credentials to GitHub. Validated that zero service role keys or backend secrets are exposed via Vite frontend bundles.
- **Consequences:** Deterministic account creation, smooth unverified-to-verified transitions, complete prevention of privilege escalation, zero credential leaks.





## ADR 009: Production Upgrade — Messaging, Admin Bootstrap, Account Lifecycle, Security Settings
- **Status:** Accepted
- **Context:** Message sending was broken (RLS policy only allowed group conversations), admin dashboard crashed on missing columns/tables, duplicate email detection relied on Supabase error strings that changed with enumeration protection, and no account lifecycle or security settings existed.
- **Decisions:**
  - **`Promise.allSettled()` in adminService:** Admin overview stats use `Promise.allSettled()` instead of `Promise.all()` so a single missing column/table does not crash the entire dashboard. Each stat degrades independently with a zero fallback.
  - **Security Definer RPCs for Account Lifecycle:** `deactivate_account()`, `reactivate_account()`, `delete_user_account()` are SECURITY DEFINER with `SET search_path = ''` — the only place where privileged operations on `auth.users` happen. No service-role key is exposed to the browser.
  - **`bootstrap_initial_admin(email)` RPC:** Initial admin setup is explicit and owner-driven. The function is callable by `authenticated` users but only promotes an email that already exists in `auth.users` and only if no admin exists yet. Prevents automatic promotion of first-registered user.
  - **Enumeration Protection Detection:** Supabase returns a dummy user with `identities: []` instead of an error when duplicate email registration is attempted (email enumeration protection). `authService.signUp()` now detects this sentinel pattern and throws a `DUPLICATE_EMAIL` error, providing appropriate UI guidance without leaking account existence.
  - **Message Retention on Account Deletion:** Messages sent by deleted accounts are anonymized to show `display_name = 'Deleted User'` rather than cascade-deleted. This preserves conversation history for other participants while removing PII from the deleted profile. Governed by `delete_user_account()` RPC which runs in a transaction.
  - **MFA Requires Dashboard Enable:** `SecuritySettingsPage` MFA TOTP enrollment uses `supabase.auth.mfa.enroll()`. This requires TOTP to be enabled in the Supabase Dashboard > Authentication > MFA settings. `supabase/config.toml` `enroll_enabled` only affects the local dev stack.
  - **`signOut(scope)` Overload:** Auth service and context expose `scope: 'global' | 'local' | 'others'` to support session management (sign out all other devices without ending the current session) from SecuritySettingsPage.
- **Consequences:** Fully resilient admin dashboard, secure account lifecycle with no frontend privilege escalation, correct duplicate-email UX, and a complete security settings center that covers the full OWASP authentication management requirements.
