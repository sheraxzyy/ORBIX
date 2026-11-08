import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database.types';

export type { Profile };

export const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'system',
  'orbix',
  'moderator',
  'mod',
  'support',
  'root',
  'api',
  'auth',
  'guest',
  'null',
  'undefined',
  'owner',
  'superuser',
  'help',
];

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Row not found
      throw error;
    }
    return data as Profile;
  },

  async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const normalized = username.trim().toLowerCase();
    if (!normalized || RESERVED_USERNAMES.includes(normalized)) {
      return false;
    }

    let req = supabase
      .from('profiles')
      .select('id')
      .ilike('username', normalized)
      .limit(1);

    if (excludeUserId) {
      req = req.neq('id', excludeUserId);
    }

    const { data, error } = await req;
    if (error) {
      console.error('Error verifying username uniqueness:', error);
      return true; // Database constraint will enforce if query fails
    }
    return !data || data.length === 0;
  },

  async updateProfile(
    userId: string,
    updates: Partial<Pick<Profile, 'display_name' | 'username' | 'bio' | 'avatar_url'>>
  ): Promise<Profile> {
    if (updates.username) {
      const cleanUsername = updates.username.trim().toLowerCase();
      if (RESERVED_USERNAMES.includes(cleanUsername)) {
        throw new Error('This username is reserved by the system. Please choose another username.');
      }
      const available = await this.isUsernameAvailable(cleanUsername, userId);
      if (!available) {
        throw new Error('This username is already taken. Please choose another username.');
      }
      updates.username = cleanUsername;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505' || error.message.includes('unique') || error.message.includes('profiles_username_unique')) {
        throw new Error('This username is already taken. Please choose another username.');
      }
      throw error;
    }
    return data as Profile;
  },

  async searchProfiles(query: string, excludeUserId?: string): Promise<Profile[]> {
    // PHASE 3: Search using username ONLY. Do NOT search by display name or email.
    const clean = query.trim().toLowerCase().replace(/^@/, '');
    if (!clean) return [];

    let req = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, created_at, updated_at')
      .ilike('username', `%${clean}%`)
      .limit(20);

    if (excludeUserId) {
      req = req.neq('id', excludeUserId);
    }

    const { data, error } = await req;
    if (error) throw error;
    return (data || []) as Profile[];
  },

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `avatars/${userId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  },
};
