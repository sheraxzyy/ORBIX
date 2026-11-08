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

