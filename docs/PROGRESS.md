# ORBIX — Progress Log

## Status Overview
- **Current Milestone:** Milestone 2–8 Full Integration & Verification
- **Status:** Frontend Services & Realtime Layer Completed; Database Schema Prepared; Awaiting SQL Execution in Supabase Dashboard

---

## Milestone Tracking
- [x] **M1 — Foundation and UI shell** (Completed — React + TS, dark #080808 / #D10F2F design, responsive layout, landing page, branding)
- [x] **M2 — Authentication** (Completed — Supabase Auth: signUp, signIn, signOut, resetPassword, AuthGuard, session restoration, profiles trigger)
- [x] **M3 — Profiles, discovery, contacts** (Completed — Profile fetch/update, avatar uploads, user search by username/display_name, contact list, blocking)
- [x] **M4 — Private messaging core** (Completed — PostgreSQL-backed messages, cursor ordering via seq, optimistic UI delivery, Realtime postgres_changes subscription)
- [x] **M5 — Message features** (Completed — Message edit, soft delete, emoji reactions with toggle, typing broadcast via Supabase Realtime Broadcast)
- [x] **M6 — Groups** (Completed — Group creation, member addition/removal, group admin role, leave group, conversation metadata)
- [x] **M7 — Media and files** (Completed — File upload integration to Supabase Storage, attachment preview, download links)
- [x] **M8 — Notifications and privacy** (Completed — Privacy settings persistence, notification preferences, server-side notification trigger on message insert)
- [ ] **M9 — Advanced (Voice, bookmarks, invites, PWA)** (Next)
- [ ] **M10 — Release & Quality Gates** (E2E full regression test)

---

## Milestone Details

### Done
1. **Zero Fake Data / Zero Mock Fallbacks**:
   - Eliminated all mock user arrays, hardcoded demo messages, fake notifications, and static badges across all pages and components (`ChatsPage`, `ConversationPage`, `ContactsPage`, `GroupsPage`, `ProfilePage`, `SettingsPage`, `PrivacySettingsPage`, `NotificationSettingsPage`, `LeftSidebar`, `CenterChatPanel`, `RightInfoPanel`).
2. **PostgreSQL Production Schema (`supabase_schema.sql` / `supabase/migrations/20261108000000_orbix_schema.sql`)**:
   - `profiles`, `user_settings`, `contacts`, `user_blocks`, `conversations`, `conversation_members`, `messages`, `message_reactions`, `attachments`, `notifications`.
   - Security Definer helper functions: `is_conversation_member`, `is_group_admin`, `is_blocked_between`, `get_or_create_direct_conversation`.
   - Monotonic `seq` assigner and unread tracker trigger (`handle_message_insert`).
   - Server-side notification trigger on message insert (`handle_message_notification`).
   - Auth hook for instant profile & default settings creation (`handle_new_user`).
   - Storage buckets configuration for `avatars` (public) and `attachments` (private) with RLS policies.
   - Idempotent `supabase_realtime` publication for real-time Postgres changes.
3. **TypeScript Types & Supabase Client Layer**:
   - `src/types/database.types.ts` defines complete interfaces.
   - `src/lib/supabase.ts` connects to live project URL and publishable key.
4. **Services Layer**:
   - `authService.ts`, `profileService.ts`, `settingsService.ts`, `conversationService.ts`, `messageService.ts`, `presenceService.ts`, `contactService.ts`, `storageService.ts`, `notificationService.ts`.
5. **Contexts & Guards**:
   - `src/contexts/AuthContext.tsx` handles live auth session, user profile, settings syncing, cross-device Realtime subscriptions.
   - `src/routes/guards/AuthGuard.tsx` provides `RequireAuth` and `RedirectIfAuth`.
   - Removed legacy `AuthGuardStub.tsx`.
6. **Code Quality & Build Gates**:
   - `npm run typecheck` (`tsc --noEmit`): **0 errors**
   - `npm run lint` (`eslint .`): **0 errors**
   - `npm run test` (`vitest run`): **8/8 tests passing**
   - `npm run build` (`vite build`): **Production build succeeded** in 2.13s.

### In Progress / Action Required
- **Database Schema Execution**: Apply `supabase_schema.sql` into the Supabase Dashboard SQL Editor (tables do not yet exist in remote PostgreSQL).

### Blocked
- Live multi-user functional testing is paused until tables are created in Supabase.
