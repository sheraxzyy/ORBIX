export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  status?: 'active' | 'suspended' | 'banned' | 'deactivated';
  suspended_until?: string | null;
  ban_reason?: string | null;
  last_seen_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  theme: 'dark' | 'light' | 'system';
  last_seen_visibility: 'everyone' | 'contacts' | 'nobody';
  online_status_visibility: 'everyone' | 'contacts' | 'nobody';
  avatar_visibility: 'everyone' | 'contacts' | 'nobody';
  notifications_enabled: boolean;
  sound_enabled: boolean;
  enter_is_send: boolean;
  active_suppression: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  contact_id: string;
  nickname: string | null;
  created_at: string;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  description: string | null;
  avatar_url: string | null;
  direct_key: string | null;
  created_by: string | null;
  last_message_id: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  last_read_message_id: string | null;
  last_read_seq: number;
  is_pinned: boolean;
  is_archived: boolean;
  is_muted: boolean;
  muted_until: string | null;
  joined_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  client_id: string;
  body: string;
  reply_to_id: string | null;
  forwarded_from_id: string | null;
  seq: number;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface MessageReceipt {
  id: string;
  message_id: string;
  user_id: string;
  conversation_id: string;
  status: 'delivered' | 'read';
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  conversation_id: string;
  message_id: string | null;
  uploader_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  sender_id: string | null;
  conversation_id: string | null;
  message_id: string | null;
  type: 'message' | 'group_invite' | 'mention' | 'reaction';
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export type AppRole = 'user' | 'moderator' | 'admin' | 'super_admin';

export interface UserRole {
  user_id: string;
  role: AppRole;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformSettings {
  id: number;
  registrations_enabled: boolean;
  invite_only: boolean;
  max_registrations_per_day: number;
  registration_notice: string;
  maintenance_mode: boolean;
  allow_guest_preview: boolean;
  updated_at: string;
  updated_by: string | null;
}

export interface RegistrationCounter {
  count_date: string;
  count: number;
  updated_at: string;
}

export interface Invitation {
  id: string;
  code: string;
  created_by: string | null;
  max_uses: number;
  uses_count: number;
  expires_at: string | null;
  created_at: string;
}

export type ReportCategory = 'spam' | 'harassment' | 'inappropriate' | 'impersonation' | 'other';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface ModerationReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  conversation_id: string | null;
  message_id: string | null;
  category: ReportCategory;
  reason: string;
  status: ReportStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_user_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}
