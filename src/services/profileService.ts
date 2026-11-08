import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database.types';

export type { Profile };

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

  async updateProfile(
    userId: string,
    updates: Partial<Pick<Profile, 'display_name' | 'username' | 'bio' | 'avatar_url'>>
  ): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  },

  async searchProfiles(query: string, excludeUserId?: string): Promise<Profile[]> {
    const clean = query.trim().toLowerCase();
    if (!clean) return [];

    let req = supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`)
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
