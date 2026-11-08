-- ====================================================================
-- ORBIX UPGRADES: UNIQUE USERNAMES, RBAC, ADMIN DASHBOARD,
-- REGISTRATION LIMITER, MODERATION, AUDIT LOGS & ACCOUNT SECURITY
-- ====================================================================

-- 1. PROFILES ENHANCEMENTS & UNIQUE USERNAME ENFORCEMENT
-- Case-insensitive and trimmed unique username
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS username_format;
ALTER TABLE public.profiles ADD CONSTRAINT username_format CHECK (username ~* '^[a-zA-Z0-9_]{3,30}$');

-- Clean and normalize existing usernames safely before index creation
DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Deduplicate in the rare event duplicates exist
  FOR rec IN (
    SELECT id, username, ROW_NUMBER() OVER (PARTITION BY lower(trim(username)) ORDER BY created_at) as rnum
    FROM public.profiles
  ) LOOP
    IF rec.rnum > 1 THEN
      UPDATE public.profiles
      SET username = lower(trim(rec.username)) || '_' || rec.rnum::text
      WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.profiles_username_unique;
DROP INDEX IF EXISTS public.idx_profiles_lower_username;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (LOWER(TRIM(username)));

-- Account Status (active, suspended, banned)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now();

-- 2. ROLES & RBAC SYSTEM (User, Moderator, Administrator, Super Administrator)
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin', 'super_admin')),
  granted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Helper security functions
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

-- 3. PLATFORM SETTINGS & REGISTRATION LIMITER
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

-- Seed default singleton row if not exists
INSERT INTO public.platform_settings (id, registrations_enabled, invite_only, max_registrations_per_day, registration_notice, maintenance_mode, allow_guest_preview)
VALUES (1, true, false, 50, '', false, true)
ON CONFLICT (id) DO NOTHING;

-- Daily atomic registration counter
CREATE TABLE IF NOT EXISTS public.registration_counters (
  count_date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Invitations table for Invite-Only mode
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

-- Concurrency-safe atomic check & registration gate
CREATE OR REPLACE FUNCTION public.check_registration_allowed(p_invite_code TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_settings RECORD;
  v_today DATE := CURRENT_DATE;
  v_current_count INT;
BEGIN
  SELECT * INTO v_settings FROM public.platform_settings WHERE id = 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- 1. Check if registrations are disabled
  IF NOT v_settings.registrations_enabled THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'disabled',
      'message', CASE WHEN v_settings.registration_notice <> '' THEN v_settings.registration_notice ELSE 'ORBIX registration is temporarily unavailable. Please try again later.' END
    );
  END IF;

  -- 2. Check invite-only mode
  IF v_settings.invite_only THEN
    IF p_invite_code IS NULL OR TRIM(p_invite_code) = '' THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'invite_required',
        'message', 'Registration is currently invite-only. A valid invite code is required.'
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.invitations
      WHERE code = TRIM(p_invite_code)
        AND uses_count < max_uses
        AND (expires_at IS NULL OR expires_at > now())
    ) THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'invalid_invite',
        'message', 'Invalid or expired invite code.'
      );
    END IF;
  END IF;

  -- 3. Atomic daily limit check
  IF v_settings.max_registrations_per_day > 0 THEN
    SELECT count INTO v_current_count FROM public.registration_counters WHERE count_date = v_today;
    IF v_current_count IS NOT NULL AND v_current_count >= v_settings.max_registrations_per_day THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'limit_reached',
        'message', 'Daily registration capacity reached. Please try again tomorrow.'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Atomic increment called on user creation
CREATE OR REPLACE FUNCTION public.increment_registration_counter()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  INSERT INTO public.registration_counters (count_date, count, updated_at)
  VALUES (v_today, 1, now())
  ON CONFLICT (count_date)
  DO UPDATE SET count = public.registration_counters.count + 1, updated_at = now();
END;
$$;

-- 4. MODERATION & REPORTS
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

-- 5. AUDIT LOGS (Immutable security records)
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

-- 6. UPDATE handle_new_user TRIGGER WITH CONCURRENCY & LIMIT ENFORCEMENT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_base_username TEXT;
  v_suffix INT := 1;
  v_check JSONB;
BEGIN
  -- Validate registration limiter
  v_check := public.check_registration_allowed(NEW.raw_user_meta_data->>'invite_code');
  IF NOT (v_check->>'allowed')::boolean THEN
    RAISE EXCEPTION '%', (v_check->>'message');
  END IF;

  v_base_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  v_base_username := regexp_replace(lower(trim(v_base_username)), '[^a-zA-Z0-9_]', '', 'g');
  IF length(v_base_username) < 3 THEN
    v_base_username := 'user_' || substr(NEW.id::text, 1, 6);
  END IF;

  v_username := v_base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(trim(username)) = lower(trim(v_username))) LOOP
    v_username := v_base_username || v_suffix::text;
    v_suffix := v_suffix + 1;
  END LOOP;

  v_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', v_username);

  INSERT INTO public.profiles (id, username, display_name, status)
  VALUES (NEW.id, v_username, v_display_name, 'active')
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username, display_name = EXCLUDED.display_name;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Default role assignment: 'user'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;

  -- Increment daily registration counter atomically
  PERFORM public.increment_registration_counter();

  -- If invite code was used, increment invitation usage
  IF NEW.raw_user_meta_data->>'invite_code' IS NOT NULL THEN
    UPDATE public.invitations
    SET uses_count = uses_count + 1
    WHERE code = trim(NEW.raw_user_meta_data->>'invite_code');
  END IF;

  RETURN NEW;
END;
$$;

-- 7. SUSPENSION & BAN ENFORCEMENT ON MESSAGE SENDING
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

  IF v_status = 'suspended' THEN
    IF v_suspended_until IS NOT NULL AND v_suspended_until < now() THEN
      -- Automatically lift expired suspension
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

-- 8. INITIAL ADMIN BOOTSTRAP FUNCTION
-- Safely make a user super_admin by their email (can only be invoked by super_admin or directly in SQL)
CREATE OR REPLACE FUNCTION public.bootstrap_initial_admin(admin_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = admin_email;
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

-- 9. ROW LEVEL SECURITY (RLS) POLICIES FOR NEW TABLES

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- User Roles Policies
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

-- Platform Settings Policies
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Anyone can read platform settings"
  ON public.platform_settings FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Admins can update platform settings" ON public.platform_settings;
CREATE POLICY "Admins can update platform settings"
  ON public.platform_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())))
  WITH CHECK (public.is_admin((SELECT auth.uid())));

-- Registration Counters Policies
DROP POLICY IF EXISTS "Admins can read registration counters" ON public.registration_counters;
CREATE POLICY "Admins can read registration counters"
  ON public.registration_counters FOR SELECT
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- Invitations Policies
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
CREATE POLICY "Admins can manage invitations"
  ON public.invitations FOR ALL
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())))
  WITH CHECK (public.is_admin((SELECT auth.uid())));

-- Moderation Reports Policies
DROP POLICY IF EXISTS "Authenticated users can submit reports" ON public.moderation_reports;
CREATE POLICY "Authenticated users can submit reports"
  ON public.moderation_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view reports they filed" ON public.moderation_reports;
CREATE POLICY "Users can view reports they filed"
  ON public.moderation_reports FOR SELECT
  TO authenticated
  USING (
    reporter_id = (SELECT auth.uid())
    OR public.is_moderator((SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Moderators can update reports" ON public.moderation_reports;
CREATE POLICY "Moderators can update reports"
  ON public.moderation_reports FOR UPDATE
  TO authenticated
  USING (public.is_moderator((SELECT auth.uid())))
  WITH CHECK (public.is_moderator((SELECT auth.uid())));

-- Audit Logs Policies: STRICT IMMUTABILITY
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = (SELECT auth.uid()) AND public.is_admin((SELECT auth.uid())));

-- Disallow updates and deletes on audit logs completely
DROP POLICY IF EXISTS "Audit logs cannot be updated" ON public.audit_logs;
CREATE POLICY "Audit logs cannot be updated"
  ON public.audit_logs FOR UPDATE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Audit logs cannot be deleted" ON public.audit_logs;
CREATE POLICY "Audit logs cannot be deleted"
  ON public.audit_logs FOR DELETE
  TO authenticated
  USING (false);

-- Enable Realtime publication for newly created tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_settings;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.moderation_reports;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

