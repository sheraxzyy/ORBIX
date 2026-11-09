-- ====================================================================
-- ORBIX MIGRATION 20261108000002: AUTH REPAIR, PROFILE TRIGGER & RLS
-- ====================================================================

-- 1. Ensure Case-Insensitive Unique Username Index
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_lower_username
  ON public.profiles (lower(trim(username)));

-- 2. Safe Public Username Availability Checker (RPC for Anon & Authenticated)
CREATE OR REPLACE FUNCTION public.check_username_available(check_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_normalized TEXT;
  v_is_reserved BOOLEAN;
BEGIN
  IF check_username IS NULL THEN
    RETURN FALSE;
  END IF;

  v_normalized := lower(trim(check_username));

  -- Minimum 3, maximum 30 characters
  IF length(v_normalized) < 3 OR length(v_normalized) > 30 THEN
    RETURN FALSE;
  END IF;

  -- Allowed characters: alphanumeric and underscores only
  IF v_normalized !~ '^[a-zA-Z0-9_]+$' THEN
    RETURN FALSE;
  END IF;

  -- System reserved username blacklist
  IF v_normalized IN (
    'admin', 'administrator', 'system', 'orbix', 'moderator',
    'mod', 'support', 'root', 'api', 'auth', 'guest', 'null',
    'undefined', 'owner', 'superuser', 'help'
  ) THEN
    RETURN FALSE;
  END IF;

  -- Case-insensitive availability check
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(trim(username)) = v_normalized
  );
END;
$$;

-- Grant execute permissions to anon and authenticated callers
GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT) TO anon, authenticated;

-- 3. Robust Authentication Hook: Profile, Settings, and User Role Initialization
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
BEGIN
  -- Extract and normalize requested username or email prefix
  v_base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  v_base_username := regexp_replace(lower(trim(v_base_username)), '[^a-zA-Z0-9_]', '', 'g');

  IF length(v_base_username) < 3 THEN
    v_base_username := 'user_' || substr(NEW.id::text, 1, 6);
  END IF;

  -- Ensure uniqueness without throwing unhandled exceptions
  v_username := v_base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(trim(username)) = lower(trim(v_username))) LOOP
    v_username := v_base_username || v_suffix::text;
    v_suffix := v_suffix + 1;
  END LOOP;

  -- Determine display name
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    v_username
  );

  -- 1. Create or update profile
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, v_username, v_display_name)
  ON CONFLICT (id) DO UPDATE
  SET
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);

  -- 2. Create default user settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. Assign base 'user' role safely (never allow client-side role escalation)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Fallback to ensure auth signup does not completely fail due to auxiliary trigger issues
  RAISE WARNING 'handle_new_user encountered error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Ensure trigger is active on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 4. RLS Self-Healing Policy for Profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile"
      ON public.profiles FOR INSERT
      TO authenticated
      WITH CHECK (id = (SELECT auth.uid()));
  END IF;
END $$;

-- 5. RLS Policy for User Roles self-read
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'user_roles'
        AND policyname = 'Users can read their own role'
    ) THEN
      CREATE POLICY "Users can read their own role"
        ON public.user_roles FOR SELECT
        TO authenticated
        USING (user_id = (SELECT auth.uid()));
    END IF;
  END IF;
END $$;

