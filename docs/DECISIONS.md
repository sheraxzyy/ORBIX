# ORBIX — Architecture Decision Records (ADR)

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


