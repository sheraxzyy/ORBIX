import { supabase } from '@/lib/supabase';
import type { Message, MessageReaction, MessageReceipt } from '@/types/database.types';

export type { Message, MessageReaction, MessageReceipt };

export interface MessageWithReactions extends Message {
  reactions?: MessageReaction[];
  senderName?: string;
  senderAvatar?: string | null;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export const messageService = {
  /**
   * Fetch messages for a conversation, including reactions and receipt status
   */
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

    // Parallel fetch reactions and message receipts
    const [reactionsRes, receiptsRes] = await Promise.allSettled([
      supabase.from('message_reactions').select('*').in('message_id', messageIds),
      supabase.from('message_receipts').select('*').in('message_id', messageIds),
    ]);

    const reactionMap = new Map<string, MessageReaction[]>();
    if (reactionsRes.status === 'fulfilled' && reactionsRes.value.data) {
      for (const r of reactionsRes.value.data as MessageReaction[]) {
        const list = reactionMap.get(r.message_id) || [];
        list.push(r);
        reactionMap.set(r.message_id, list);
      }
    }

    const receiptMap = new Map<string, 'delivered' | 'read'>();
    if (receiptsRes.status === 'fulfilled' && receiptsRes.value.data) {
      for (const rc of receiptsRes.value.data as MessageReceipt[]) {
        const current = receiptMap.get(rc.message_id);
        if (rc.status === 'read' || current !== 'read') {
          receiptMap.set(rc.message_id, rc.status);
        }
      }
    }

    return reversed.map((m) => ({
      ...m,
      reactions: reactionMap.get(m.id) || [],
      status: receiptMap.get(m.id) || 'read',
    }));
  },

  /**
   * Insert a message into PostgreSQL with client-side deduplication client_id
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    body: string,
    replyToId?: string,
    providedClientId?: string
  ): Promise<Message> {
    const trimmed = body.trim();
    if (!trimmed) {
      throw new Error('Message body cannot be empty or whitespace only.');
    }

    const clientId = providedClientId || crypto.randomUUID();

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        client_id: clientId,
        body: trimmed,
        reply_to_id: replyToId || null,
        seq: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting message to Supabase:', error);
      throw new Error(error.message || 'Failed to send message.');
    }
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

  /**
   * Advance conversation read pointer and record read receipt
   */
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

    // Record read receipt in message_receipts
    try {
      await supabase.from('message_receipts').upsert(
        {
          message_id: lastMessageId,
          user_id: userId,
          conversation_id: conversationId,
          status: 'read',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'message_id,user_id' }
      );
    } catch {
      // Non-fatal if table is awaiting migration
    }
  },

  /**
   * Record delivery receipt when recipient receives realtime message
   */
  async markAsDelivered(
    conversationId: string,
    userId: string,
    messageId: string
  ): Promise<void> {
    try {
      await supabase.from('message_receipts').upsert(
        {
          message_id: messageId,
          user_id: userId,
          conversation_id: conversationId,
          status: 'delivered',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'message_id,user_id' }
      );
    } catch {
      // Non-fatal
    }
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
