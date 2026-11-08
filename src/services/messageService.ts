import { supabase } from '@/lib/supabase';
import type { Message, MessageReaction } from '@/types/database.types';

export type { Message, MessageReaction };

export interface MessageWithReactions extends Message {
  reactions?: MessageReaction[];
  senderName?: string;
  senderAvatar?: string | null;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export const messageService = {
  async getMessages(
    conversationId: string,
    limit = 50,
    beforeSeq?: number
  ): Promise<MessageWithReactions[]> {
    let req = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('seq', { ascending: false })
      .limit(limit);

    if (beforeSeq !== undefined) {
      req = req.lt('seq', beforeSeq);
    }

    const { data: messages, error } = await req;
    if (error) throw error;
    if (!messages || messages.length === 0) return [];

    const msgList = messages as Message[];
    const reversed = [...msgList].reverse();

    const messageIds = reversed.map((m) => m.id);
    const { data: reactions } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', messageIds);

    const reactionMap = new Map<string, MessageReaction[]>();
    for (const r of (reactions || []) as MessageReaction[]) {
      const list = reactionMap.get(r.message_id) || [];
      list.push(r);
      reactionMap.set(r.message_id, list);
    }

    return reversed.map((m) => ({
      ...m,
      reactions: reactionMap.get(m.id) || [],
      status: 'read' as const,
    }));
  },

  async sendMessage(
    conversationId: string,
    senderId: string,
    body: string,
    replyToId?: string
  ): Promise<Message> {
    const clientId = crypto.randomUUID();

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        client_id: clientId,
        body: body.trim(),
        reply_to_id: replyToId || null,
        seq: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Message;
  },

  async editMessage(messageId: string, senderId: string, newBody: string): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .update({
        body: newBody.trim(),
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .eq('sender_id', senderId)
      .select()
      .single();

    if (error) throw error;
    return data as Message;
  },

  async deleteMessage(messageId: string, senderId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({
        body: 'This message was deleted.',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .eq('sender_id', senderId);

    if (error) throw error;
  },

  async addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction> {
    const { data, error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: userId,
        emoji,
      })
      .select()
      .single();

    if (error) throw error;
    return data as MessageReaction;
  },

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);

    if (error) throw error;
  },

  async markAsRead(
    conversationId: string,
    userId: string,
    lastMessageId: string,
    lastSeq: number
  ): Promise<void> {
    const { error } = await supabase
      .from('conversation_members')
      .update({
        last_read_message_id: lastMessageId,
        last_read_seq: lastSeq,
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) console.error('Failed to update read pointer:', error);
  },

  subscribeToConversationMessages(
    conversationId: string,
    handlers: {
      onInsert?: (msg: Message) => void;
      onUpdate?: (msg: Message) => void;
      onDelete?: (id: string) => void;
    }
  ) {
    const channel = supabase
      .channel(`chat-messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.new && handlers.onInsert) {
            handlers.onInsert(payload.new as Message);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.new && handlers.onUpdate) {
            handlers.onUpdate(payload.new as Message);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.old && handlers.onDelete) {
            handlers.onDelete((payload.old as { id: string }).id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
