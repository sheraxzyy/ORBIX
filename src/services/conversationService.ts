import { supabase } from '@/lib/supabase';
import type { Conversation, ConversationMember, Profile } from '@/types/database.types';

export type { Conversation, ConversationMember };

export interface ConversationWithDetails extends Conversation {
  member: ConversationMember;
  participants: Profile[];
  displayName: string;
  displayAvatar: string | null;
  unreadCount: number;
}

export const conversationService = {
  async getConversations(userId: string): Promise<ConversationWithDetails[]> {
    const { data: memberRows, error: memberErr } = await supabase
      .from('conversation_members')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false);

    if (memberErr) throw memberErr;
    if (!memberRows || memberRows.length === 0) return [];

    const members = memberRows as ConversationMember[];
    const convIds = members.map((m) => m.conversation_id);

    const { data: convs, error: convErr } = await supabase
      .from('conversations')
      .select('*')
      .in('id', convIds)
      .order('last_message_at', { ascending: false });

    if (convErr) throw convErr;
    if (!convs) return [];

    const convList = convs as Conversation[];

    const { data: allMembers, error: allMembersErr } = await supabase
      .from('conversation_members')
      .select('*')
      .in('conversation_id', convIds);

    if (allMembersErr) throw allMembersErr;

    const allMembersList = (allMembers || []) as ConversationMember[];
    const allUserIds = Array.from(new Set(allMembersList.map((m) => m.user_id)));

    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .in('id', allUserIds);

    if (profErr) throw profErr;

    const profileMap = new Map<string, Profile>();
    for (const p of (profiles || []) as Profile[]) {
      profileMap.set(p.id, p);
    }

    const memberMap = new Map<string, ConversationMember>();
    for (const m of members) {
      memberMap.set(m.conversation_id, m);
    }

    const convMembersMap = new Map<string, string[]>();
    for (const m of allMembersList) {
      const list = convMembersMap.get(m.conversation_id) || [];
      list.push(m.user_id);
      convMembersMap.set(m.conversation_id, list);
    }

    return convList.map((conv) => {
      const member = memberMap.get(conv.id)!;
      const memberIds = convMembersMap.get(conv.id) || [];
      const participants = memberIds
        .map((uid) => profileMap.get(uid))
        .filter((p): p is Profile => Boolean(p));

      let displayName = conv.name || 'Direct Chat';
      let displayAvatar = conv.avatar_url;

      if (conv.type === 'direct') {
        const other = participants.find((p) => p.id !== userId);
        if (other) {
          displayName = other.display_name;
          displayAvatar = other.avatar_url;
        }
      }

      return {
        ...conv,
        member,
        participants,
        displayName,
        displayAvatar,
        unreadCount: 0,
      };
    });
  },

  async getConversation(
    conversationId: string,
    currentUserId: string
  ): Promise<ConversationWithDetails | null> {
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convErr || !conv) return null;

    const conversation = conv as Conversation;

    const { data: member, error: memErr } = await supabase
      .from('conversation_members')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', currentUserId)
      .single();

    if (memErr || !member) return null;

    const convMember = member as ConversationMember;

    const { data: allMembers } = await supabase
      .from('conversation_members')
      .select('*')
      .eq('conversation_id', conversationId);

    const userIds = ((allMembers || []) as ConversationMember[]).map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    const participants = (profiles || []) as Profile[];

    let displayName = conversation.name || 'Chat';
    let displayAvatar = conversation.avatar_url;

    if (conversation.type === 'direct') {
      const other = participants.find((p) => p.id !== currentUserId);
      if (other) {
        displayName = other.display_name;
        displayAvatar = other.avatar_url;
      }
    }

    return {
      ...conversation,
      member: convMember,
      participants,
      displayName,
      displayAvatar,
      unreadCount: 0,
    };
  },

  async getOrCreateDirectConversation(targetUserId: string): Promise<string> {
    const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
      target_user_id: targetUserId,
    });

    if (!error && data) {
      return data as string;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const key =
      user.id < targetUserId
        ? `${user.id}:${targetUserId}`
        : `${targetUserId}:${user.id}`;

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('direct_key', key)
      .maybeSingle();

    if (existing && (existing as { id: string }).id) {
      return (existing as { id: string }).id;
    }

    const { data: newConv, error: createErr } = await supabase
      .from('conversations')
      .insert({
        type: 'direct',
        direct_key: key,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (createErr) throw createErr;
    const createdConv = newConv as { id: string };

    await supabase.from('conversation_members').insert([
      { conversation_id: createdConv.id, user_id: user.id, role: 'member' },
      { conversation_id: createdConv.id, user_id: targetUserId, role: 'member' },
    ]);

    return createdConv.id;
  },

  async createGroup(name: string, description: string, memberIds: string[]): Promise<string> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        type: 'group',
        name: name.trim(),
        description: description.trim(),
        created_by: user.id,
      })
      .select('id')
      .single();

    if (convErr) throw convErr;
    const createdConv = conv as { id: string };

    const allMembers = Array.from(new Set([user.id, ...memberIds]));
    const memberRows = allMembers.map((uid) => ({
      conversation_id: createdConv.id,
      user_id: uid,
      role: uid === user.id ? 'owner' : 'member',
    }));

    const { error: memErr } = await supabase.from('conversation_members').insert(memberRows);
    if (memErr) throw memErr;

    return createdConv.id;
  },

  async pinConversation(conversationId: string, userId: string, isPinned: boolean) {
    const { error } = await supabase
      .from('conversation_members')
      .update({ is_pinned: isPinned })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async archiveConversation(conversationId: string, userId: string, isArchived: boolean) {
    const { error } = await supabase
      .from('conversation_members')
      .update({ is_archived: isArchived })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async muteConversation(conversationId: string, userId: string, isMuted: boolean) {
    const { error } = await supabase
      .from('conversation_members')
      .update({ is_muted: isMuted })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async leaveGroup(conversationId: string, userId: string) {
    const { error } = await supabase
      .from('conversation_members')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
    if (error) throw error;
  },

  subscribeToConversations(userId: string, onChange: () => void) {
    const channel = supabase
      .channel(`user-conversations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => onChange()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_members',
          filter: `user_id=eq.${userId}`,
        },
        () => onChange()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => onChange()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
