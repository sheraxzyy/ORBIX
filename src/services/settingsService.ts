import { supabase } from '@/lib/supabase';
import type { UserSettings } from '@/types/database.types';

export type { UserSettings };

export const settingsService = {
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return await this.createDefaultSettings(userId);
      }
      throw error;
    }
    return data as UserSettings;
  },

  async createDefaultSettings(userId: string): Promise<UserSettings> {
    const defaultVals = {
      user_id: userId,
      theme: 'dark',
      last_seen_visibility: 'everyone',
      online_status_visibility: 'everyone',
      avatar_visibility: 'everyone',
      notifications_enabled: true,
      sound_enabled: true,
      enter_is_send: true,
      active_suppression: true,
    };

    const { data, error } = await supabase
      .from('user_settings')
      .insert(defaultVals)
      .select()
      .single();

    if (error) throw error;
    return data as UserSettings;
  },

  async updateUserSettings(
    userId: string,
    updates: Partial<Omit<UserSettings, 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<UserSettings> {
    const { data, error } = await supabase
      .from('user_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as UserSettings;
  },

  subscribeToUserSettings(userId: string, onUpdate: (settings: UserSettings) => void) {
    const channel = supabase
      .channel(`user-settings:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            onUpdate(payload.new as UserSettings);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
