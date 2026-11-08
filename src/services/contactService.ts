import { supabase } from '@/lib/supabase';
import type { Contact, UserBlock, Profile } from '@/types/database.types';

export type { Contact, UserBlock };

export interface ContactWithProfile extends Contact {
  profile: Profile;
}

export const contactService = {
  async getContacts(userId: string): Promise<ContactWithProfile[]> {
    const { data: contacts, error: contactErr } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId);

    if (contactErr) throw contactErr;
    if (!contacts || contacts.length === 0) return [];

    const contactList = contacts as Contact[];
    const contactIds = contactList.map((c) => c.contact_id);

    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .in('id', contactIds);

    if (profErr) throw profErr;

    const profileMap = new Map<string, Profile>();
    for (const p of (profiles || []) as Profile[]) {
      profileMap.set(p.id, p);
    }

    return contactList
      .map((c) => ({
        ...c,
        profile: profileMap.get(c.contact_id)!,
      }))
      .filter((c) => Boolean(c.profile));
  },

  async addContact(userId: string, contactId: string, nickname?: string): Promise<Contact> {
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        user_id: userId,
        contact_id: contactId,
        nickname: nickname || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Contact;
  },

  async removeContact(userId: string, contactId: string): Promise<void> {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('user_id', userId)
      .eq('contact_id', contactId);

    if (error) throw error;
  },

  async getBlockedUsers(userId: string): Promise<Profile[]> {
    const { data: blocks, error } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', userId);

    if (error) throw error;
    if (!blocks || blocks.length === 0) return [];

    const blockedIds = (blocks as Array<{ blocked_id: string }>).map((b) => b.blocked_id);
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .in('id', blockedIds);

    if (profErr) throw profErr;
    return (profiles || []) as Profile[];
  },

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await supabase.from('user_blocks').insert({
      blocker_id: blockerId,
      blocked_id: blockedId,
    });
    if (error) throw error;
  },

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);
    if (error) throw error;
  },
};
