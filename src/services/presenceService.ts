import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceUser {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  onlineAt: string;
}

export const presenceService = {
  createGlobalPresenceChannel(
    currentUser: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl?: string | null;
    },
    onPresenceSync: (onlineUsers: Record<string, PresenceUser>) => void
  ): RealtimeChannel {
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: Record<string, PresenceUser> = {};

        for (const [key, presences] of Object.entries(state)) {
          if (presences && presences.length > 0) {
            const p = presences[0] as unknown as PresenceUser;
            users[key] = p;
          }
        }

        onPresenceSync(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: currentUser.id,
            username: currentUser.username,
            displayName: currentUser.displayName,
            avatarUrl: currentUser.avatarUrl,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return channel;
  },

  createConversationPresence(
    conversationId: string,
    currentUser: { id: string; username: string; displayName: string },
    onTypingChange: (typingUsers: Record<string, { username: string; isTyping: boolean }>) => void
  ): RealtimeChannel {
    const typingState: Record<string, { username: string; isTyping: boolean }> = {};
    const timeoutMap: Record<string, ReturnType<typeof setTimeout>> = {};

    const channel = supabase.channel(`typing:${conversationId}`);

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const { userId, username, isTyping } = payload;
        if (userId === currentUser.id) return; // Ignore own echo

        if (isTyping) {
          typingState[userId] = { username, isTyping: true };
          onTypingChange({ ...typingState });

          // Auto-clear after 3 seconds of inactivity
          if (timeoutMap[userId]) clearTimeout(timeoutMap[userId]);
          timeoutMap[userId] = setTimeout(() => {
            delete typingState[userId];
            onTypingChange({ ...typingState });
          }, 3000);
        } else {
          delete typingState[userId];
          if (timeoutMap[userId]) clearTimeout(timeoutMap[userId]);
          onTypingChange({ ...typingState });
        }
      })
      .subscribe();

    return channel;
  },

  broadcastTyping(
    channel: RealtimeChannel,
    userId: string,
    username: string,
    isTyping: boolean
  ) {
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, username, isTyping },
    });
  },
};

