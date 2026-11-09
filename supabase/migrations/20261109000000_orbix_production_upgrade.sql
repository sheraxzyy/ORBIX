-- ====================================================================
-- ORBIX COMPLETE PRODUCTION UPGRADE & SECURITY REPAIR
-- Migration: 20261109000000_orbix_production_upgrade.sql
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. PROFILES ENHANCEMENTS: STATUS, SUSPENSION, DEACTIVATION & AUDIT FIELDS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
  END IF;

  -- Ensure valid status constraint including deactivated
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check
    CHECK (status IN ('active', 'suspended', 'banned', 'deactivated'));

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'suspended_until'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN suspended_until TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'ban_reason'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN ban_reason TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_seen_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_seen_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Enforce lowercase trimmed unique username index
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_lower_username
  ON public.profiles (lower(trim(username)));

-- 3. MESSAGE RECEIPTS TABLE (Delivery and Read Receipts)
CREATE TABLE IF NOT EXISTS public.message_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('delivered', 'read')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT unique_message_user_receipt UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_receipts_message ON public.message_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_receipts_conv_user ON public.message_receipts(conversation_id, user_id);

ALTER TABLE public.message_receipts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'message_receipts' AND policyname = 'Members can view message receipts'
  ) THEN
    CREATE POLICY "Members can view message receipts"
      ON public.message_receipts FOR SELECT
      TO authenticated
      USING (public.is_conversation_member(conversation_id, (SELECT auth.uid())));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'message_receipts' AND policyname = 'Users can upsert own message receipts'
  ) THEN
    CREATE POLICY "Users can upsert own message receipts"
      ON public.message_receipts FOR ALL
      TO authenticated
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- 4. REPAIR CONVERSATIONS & CONVERSATION MEMBERS RLS POLICIES
-- Allow authenticated users to create direct conversations as well as group conversations
DROP POLICY IF EXISTS "Authenticated users can create group conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

-- Allow members to insert conversation members in direct chat or group admin
DROP POLICY IF EXISTS "Users can join or admins add members" ON public.conversation_members;
CREATE POLICY "Users can join or admins add members"
  ON public.conversation_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_group_admin(conversation_id, (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND c.created_by = (SELECT auth.uid())
        AND c.type = 'direct'
    )
  );

-- 5. ROLES & RBAC SYSTEM
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin', 'super_admin')),
  granted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT COALESCE((SELECT role FROM public.user_roles WHERE user_id = p_user_id), 'user');
$$;

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_moderator(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role IN ('moderator', 'admin', 'super_admin')
  );
$$;

DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Only super admins can manage roles" ON public.user_roles;
CREATE POLICY "Only super admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_super_admin((SELECT auth.uid())))
  WITH CHECK (public.is_super_admin((SELECT auth.uid())));

-- 6. PLATFORM SETTINGS & REGISTRATION LIMITER
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  registrations_enabled BOOLEAN NOT NULL DEFAULT true,
  invite_only BOOLEAN NOT NULL DEFAULT false,
  max_registrations_per_day INT NOT NULL DEFAULT 50 CHECK (max_registrations_per_day >= 0),
  registration_notice TEXT NOT NULL DEFAULT '',
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  allow_guest_preview BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_by UUID REFERENCES public.profiles(id)
);

INSERT INTO public.platform_settings (id, registrations_enabled, invite_only, max_registrations_per_day, registration_notice, maintenance_mode, allow_guest_preview)
VALUES (1, true, false, 50, '', false, true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Anyone can read platform settings"
  ON public.platform_settings FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Only super admins can update platform settings" ON public.platform_settings;
CREATE POLICY "Only super admins can update platform settings"
  ON public.platform_settings FOR ALL
  TO authenticated
  USING (public.is_super_admin((SELECT auth.uid())))
  WITH CHECK (public.is_super_admin((SELECT auth.uid())));

-- 7. REGISTRATION COUNTERS & INVITATIONS
CREATE TABLE IF NOT EXISTS public.registration_counters (
  count_date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.registration_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view registration counters" ON public.registration_counters;
CREATE POLICY "Admins can view registration counters"
  ON public.registration_counters FOR SELECT
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  max_uses INT NOT NULL DEFAULT 1,
  uses_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.invitations(code);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can check an invitation code" ON public.invitations;
CREATE POLICY "Anyone can check an invitation code"
  ON public.invitations FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
CREATE POLICY "Admins can manage invitations"
  ON public.invitations FOR ALL
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())))
  WITH CHECK (public.is_admin((SELECT auth.uid())));

-- 8. MODERATION REPORTS & AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('spam', 'harassment', 'inappropriate', 'impersonation', 'other')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.moderation_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.moderation_reports(reported_user_id);

ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can submit reports" ON public.moderation_reports;
CREATE POLICY "Users can submit reports"
  ON public.moderation_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own submitted reports" ON public.moderation_reports;
CREATE POLICY "Users can view own submitted reports"
  ON public.moderation_reports FOR SELECT
  TO authenticated
  USING (reporter_id = (SELECT auth.uid()) OR public.is_moderator((SELECT auth.uid())));

DROP POLICY IF EXISTS "Moderators can update reports" ON public.moderation_reports;
CREATE POLICY "Moderators can update reports"
  ON public.moderation_reports FOR UPDATE
  TO authenticated
  USING (public.is_moderator((SELECT auth.uid())))
  WITH CHECK (public.is_moderator((SELECT auth.uid())));

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action_type TEXT NOT NULL,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON public.audit_logs(admin_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = (SELECT auth.uid()) AND public.is_admin((SELECT auth.uid())));

-- 9. CHECK USER STATUS TRIGGER ON MESSAGES (Suspended, Banned, Deactivated Enforcement)
CREATE OR REPLACE FUNCTION public.check_user_active_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status TEXT;
  v_suspended_until TIMESTAMPTZ;
BEGIN
  SELECT status, suspended_until INTO v_status, v_suspended_until
  FROM public.profiles
  WHERE id = NEW.sender_id;

  IF v_status = 'banned' THEN
    RAISE EXCEPTION 'Your account has been permanently banned from ORBIX.';
  END IF;

  IF v_status = 'deactivated' THEN
    RAISE EXCEPTION 'Your account is currently deactivated. Please reactivate your account in security settings.';
  END IF;

  IF v_status = 'suspended' THEN
    IF v_suspended_until IS NOT NULL AND v_suspended_until < now() THEN
      UPDATE public.profiles SET status = 'active', suspended_until = NULL WHERE id = NEW.sender_id;
    ELSE
      RAISE EXCEPTION 'Your account is currently suspended from sending messages.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_check_user_status_on_message ON public.messages;
CREATE TRIGGER tr_check_user_status_on_message
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.check_user_active_status();

-- 10. ACCOUNT DEACTIVATION & REACTIVATION SECURE FUNCTIONS
CREATE OR REPLACE FUNCTION public.deactivate_account()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles
  SET status = 'deactivated', updated_at = now()
  WHERE id = v_user_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deactivate_account() TO authenticated;

CREATE OR REPLACE FUNCTION public.reactivate_account()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles
  SET status = 'active', updated_at = now()
  WHERE id = v_user_id AND status = 'deactivated';

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reactivate_account() TO authenticated;

-- 11. INITIAL ADMIN BOOTSTRAP FUNCTION
CREATE OR REPLACE FUNCTION public.bootstrap_initial_admin(admin_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = lower(trim(admin_email));
  IF v_uid IS NULL THEN
    RETURN 'User not found in auth.users';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'super_admin')
  ON CONFLICT (user_id)
  DO UPDATE SET role = 'super_admin', updated_at = now();

  RETURN 'Successfully granted super_admin role to ' || admin_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_initial_admin(TEXT) TO authenticated, anon;

-- 12. SECURE ACCOUNT DELETION WORKFLOW
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Anonymize user profile so existing conversation history remains readable for other participants
  UPDATE public.profiles
  SET display_name = 'Deleted User',
      avatar_url = NULL,
      bio = 'This account was deleted.',
      status = 'banned'
  WHERE id = v_user_id;

  -- 2. Remove user contacts and blocks
  DELETE FROM public.contacts WHERE user_id = v_user_id OR contact_id = v_user_id;
  DELETE FROM public.user_blocks WHERE blocker_id = v_user_id OR blocked_id = v_user_id;

  -- 3. Leave group conversations
  DELETE FROM public.conversation_members
  WHERE user_id = v_user_id
    AND conversation_id IN (SELECT id FROM public.conversations WHERE type = 'group');

  -- 4. Delete user settings and notifications
  DELETE FROM public.user_settings WHERE user_id = v_user_id;
  DELETE FROM public.notifications WHERE user_id = v_user_id;

  -- 5. Delete authentication record
  DELETE FROM auth.users WHERE id = v_user_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- 13. REALTIME REPLICATION FOR NEW TABLES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class pc ON pr.prrelid = pc.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime' AND pc.relname = 'message_receipts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_receipts;
  END IF;
END $$;

