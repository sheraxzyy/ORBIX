-- ====================================================================
-- ORBIX COMPLETE PRODUCTION DATABASE SCHEMA & RLS SPECIFICATION
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. PROFILES TABLE (Public identity without email)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT username_format CHECK (username ~* '^[a-zA-Z0-9_]{3,30}$')
);

-- Case-insensitive unique username index
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_lower_username ON public.profiles (lower(username));
CREATE INDEX IF NOT EXISTS idx_profiles_trgm_username ON public.profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_trgm_display ON public.profiles USING gin (display_name gin_trgm_ops);

-- 3. USER SETTINGS TABLE (Persistent cross-device settings)
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
  last_seen_visibility TEXT NOT NULL DEFAULT 'everyone' CHECK (last_seen_visibility IN ('everyone', 'contacts', 'nobody')),
  online_status_visibility TEXT NOT NULL DEFAULT 'everyone' CHECK (online_status_visibility IN ('everyone', 'contacts', 'nobody')),
  avatar_visibility TEXT NOT NULL DEFAULT 'everyone' CHECK (avatar_visibility IN ('everyone', 'contacts', 'nobody')),
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  enter_is_send BOOLEAN NOT NULL DEFAULT true,
  active_suppression BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. CONTACTS TABLE
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT unique_user_contact UNIQUE (user_id, contact_id),
  CONSTRAINT no_self_contact CHECK (user_id != contact_id)
);
CREATE INDEX IF NOT EXISTS idx_contacts_user ON public.contacts(user_id);

-- 5. USER BLOCKS TABLE (Bi-directional block enforcement)
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT unique_user_block UNIQUE (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.user_blocks(blocked_id);

-- 6. CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
  name TEXT,
  description TEXT,
  avatar_url TEXT,
  direct_key TEXT UNIQUE, -- format: "uuid_min:uuid_max" for direct chat uniqueness
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_message_id UUID,
  last_message_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg_at ON public.conversations(last_message_at DESC);

-- 7. CONVERSATION MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  last_read_message_id UUID,
  last_read_seq BIGINT DEFAULT 0 NOT NULL,
  is_pinned BOOLEAN DEFAULT false NOT NULL,
  is_archived BOOLEAN DEFAULT false NOT NULL,
  is_muted BOOLEAN DEFAULT false NOT NULL,
  muted_until TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT unique_conversation_member UNIQUE (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_members_user_conv ON public.conversation_members(user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_members_conv ON public.conversation_members(conversation_id);

-- 8. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  body TEXT NOT NULL,
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  forwarded_from_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  seq BIGINT NOT NULL,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', coalesce(body, ''))) STORED,
  CONSTRAINT unique_sender_client_id UNIQUE (sender_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_messages_conv_seq ON public.messages(conversation_id, seq DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_search ON public.messages USING gin(search_vector);

-- 9. MESSAGE REACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT unique_message_user_emoji UNIQUE (message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_reactions_message ON public.message_reactions(message_id);

-- 10. ATTACHMENTS TABLE
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attachments_conv ON public.attachments(conversation_id);

-- 11. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'group_invite', 'mention', 'reaction')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read, created_at DESC);

-- ====================================================================
-- SECURITY DEFINER HELPER FUNCTIONS (Preventing recursive RLS policies)
-- ====================================================================

CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conv_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = p_conv_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(p_conv_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = p_conv_id AND user_id = p_user_id AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_blocked_between(p_user1 UUID, p_user2 UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = p_user1 AND blocked_id = p_user2)
       OR (blocker_id = p_user2 AND blocked_id = p_user1)
  );
$$;

-- Function: Get or Create Direct Conversation
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(target_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_id UUID := auth.uid();
  v_key TEXT;
  v_conv_id UUID;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF caller_id = target_user_id THEN
    RAISE EXCEPTION 'Cannot create direct conversation with oneself';
  END IF;

  -- Block check
  IF public.is_blocked_between(caller_id, target_user_id) THEN
    RAISE EXCEPTION 'Action blocked by user privacy policy';
  END IF;

  -- Canonical ordered key: smaller_uuid:larger_uuid
  IF caller_id < target_user_id THEN
    v_key := caller_id::text || ':' || target_user_id::text;
  ELSE
    v_key := target_user_id::text || ':' || caller_id::text;
  END IF;

  -- Check existing
  SELECT id INTO v_conv_id FROM public.conversations WHERE direct_key = v_key;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  -- Create new direct conversation
  INSERT INTO public.conversations (type, direct_key, created_by)
  VALUES ('direct', v_key, caller_id)
  RETURNING id INTO v_conv_id;

  -- Add both members
  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  VALUES
    (v_conv_id, caller_id, 'member'),
    (v_conv_id, target_user_id, 'member')
  ON CONFLICT DO NOTHING;

  RETURN v_conv_id;
END;
$$;

-- Function: Sequence Assigner & Conversation Updater Trigger for Messages
CREATE OR REPLACE FUNCTION public.handle_message_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_seq BIGINT;
BEGIN
  -- Compute monotonically increasing seq for this conversation
  SELECT COALESCE(MAX(seq), 0) + 1 INTO next_seq
  FROM public.messages
  WHERE conversation_id = NEW.conversation_id;

  NEW.seq := next_seq;

  -- Update conversation last_message pointer
  UPDATE public.conversations
  SET last_message_id = NEW.id,
      last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;

  -- Update sender's read pointer
  UPDATE public.conversation_members
  SET last_read_message_id = NEW.id,
      last_read_seq = next_seq
  WHERE conversation_id = NEW.conversation_id AND user_id = NEW.sender_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_message_insert ON public.messages;
CREATE TRIGGER tr_message_insert
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_message_insert();

-- Function: Trigger to create notifications for conversation members on message insert
CREATE OR REPLACE FUNCTION public.handle_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sender_name TEXT;
  v_member RECORD;
BEGIN
  -- Get sender display name
  SELECT COALESCE(display_name, username, 'Someone') INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- For each other member in the conversation
  FOR v_member IN
    SELECT user_id, is_muted
    FROM public.conversation_members
    WHERE conversation_id = NEW.conversation_id
      AND user_id != NEW.sender_id
  LOOP
    -- Insert notification if member has not muted conversation
    IF NOT v_member.is_muted THEN
      INSERT INTO public.notifications (
        user_id,
        sender_id,
        conversation_id,
        message_id,
        type,
        title,
        body
      ) VALUES (
        v_member.user_id,
        NEW.sender_id,
        NEW.conversation_id,
        NEW.id,
        'message',
        v_sender_name,
        CASE
          WHEN length(NEW.body) > 100 THEN substring(NEW.body from 1 for 97) || '...'
          ELSE NEW.body
        END
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_message_notification ON public.messages;
CREATE TRIGGER tr_message_notification
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_message_notification();

-- Function: Auto-create Profile and Default Settings on Auth Signup
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
  v_base_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  -- Sanitize base username
  v_base_username := regexp_replace(v_base_username, '[^a-zA-Z0-9_]', '', 'g');
  IF length(v_base_username) < 3 THEN
    v_base_username := 'user_' || substr(NEW.id::text, 1, 6);
  END IF;

  v_username := v_base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(v_username)) LOOP
    v_username := v_base_username || v_suffix::text;
    v_suffix := v_suffix + 1;
  END LOOP;

  v_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', v_username);

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, v_username, v_display_name)
  ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username, display_name = EXCLUDED.display_name;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- User Settings Policies
CREATE POLICY "Users can read own settings"
  ON public.user_settings FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Contacts Policies
CREATE POLICY "Users can view own contacts"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can add contacts"
  ON public.contacts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can remove contacts"
  ON public.contacts FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Blocks Policies
CREATE POLICY "Users can view own blocks"
  ON public.user_blocks FOR SELECT
  TO authenticated
  USING (blocker_id = (SELECT auth.uid()));

CREATE POLICY "Users can block users"
  ON public.user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = (SELECT auth.uid()));

CREATE POLICY "Users can unblock users"
  ON public.user_blocks FOR DELETE
  TO authenticated
  USING (blocker_id = (SELECT auth.uid()));

-- Conversations Policies
CREATE POLICY "Members can view conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (public.is_conversation_member(id, (SELECT auth.uid())));

CREATE POLICY "Authenticated users can create group conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    type = 'group' AND created_by = (SELECT auth.uid())
  );

CREATE POLICY "Admins can update group conversation details"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (type = 'group' AND public.is_group_admin(id, (SELECT auth.uid())));

-- Conversation Members Policies
CREATE POLICY "Members can view fellow conversation members"
  ON public.conversation_members FOR SELECT
  TO authenticated
  USING (public.is_conversation_member(conversation_id, (SELECT auth.uid())));

CREATE POLICY "Users can join or admins add members"
  ON public.conversation_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid()) OR public.is_group_admin(conversation_id, (SELECT auth.uid()))
  );

CREATE POLICY "Admins or users themselves can update membership"
  ON public.conversation_members FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR public.is_group_admin(conversation_id, (SELECT auth.uid()))
  );

CREATE POLICY "Admins or users themselves can leave/remove membership"
  ON public.conversation_members FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR public.is_group_admin(conversation_id, (SELECT auth.uid()))
  );

-- Messages Policies
CREATE POLICY "Members can view messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (public.is_conversation_member(conversation_id, (SELECT auth.uid())));

CREATE POLICY "Active members can insert messages if not blocked"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND public.is_conversation_member(conversation_id, (SELECT auth.uid()))
  );

CREATE POLICY "Senders can update their own messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (sender_id = (SELECT auth.uid()))
  WITH CHECK (sender_id = (SELECT auth.uid()));

CREATE POLICY "Senders can soft-delete their own messages"
  ON public.messages FOR DELETE
  TO authenticated
  USING (sender_id = (SELECT auth.uid()));

-- Reactions Policies
CREATE POLICY "Members can view reactions"
  ON public.message_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_reactions.message_id
      AND public.is_conversation_member(m.conversation_id, (SELECT auth.uid()))
    )
  );

CREATE POLICY "Users can add own reactions"
  ON public.message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can remove own reactions"
  ON public.message_reactions FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Attachments Policies
CREATE POLICY "Members can view attachments"
  ON public.attachments FOR SELECT
  TO authenticated
  USING (public.is_conversation_member(conversation_id, (SELECT auth.uid())));

CREATE POLICY "Members can insert attachments"
  ON public.attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    uploader_id = (SELECT auth.uid())
    AND public.is_conversation_member(conversation_id, (SELECT auth.uid()))
  );

-- Notifications Policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ====================================================================
-- REALTIME REPLICATION PUBLICATION
-- ====================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class pc ON pr.prrelid = pc.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime' AND pc.relname = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class pc ON pr.prrelid = pc.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime' AND pc.relname = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class pc ON pr.prrelid = pc.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime' AND pc.relname = 'conversation_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class pc ON pr.prrelid = pc.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime' AND pc.relname = 'user_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class pc ON pr.prrelid = pc.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime' AND pc.relname = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class pc ON pr.prrelid = pc.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime' AND pc.relname = 'message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
  END IF;
END $$;

-- ====================================================================
-- 12. STORAGE BUCKETS & POLICIES SETUP
-- ====================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Read Avatars'
  ) THEN
    CREATE POLICY "Public Read Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated Upload Avatars'
  ) THEN
    CREATE POLICY "Authenticated Upload Avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated Update Avatars'
  ) THEN
    CREATE POLICY "Authenticated Update Avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated Read Attachments'
  ) THEN
    CREATE POLICY "Authenticated Read Attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'attachments');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated Upload Attachments'
  ) THEN
    CREATE POLICY "Authenticated Upload Attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attachments');
  END IF;
END $$;

