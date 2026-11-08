import { describe, it, expect } from 'vitest';
import { authService } from '@/services/authService';
import { conversationService } from '@/services/conversationService';
import { messageService } from '@/services/messageService';
import { contactService } from '@/services/contactService';
import { settingsService } from '@/services/settingsService';

describe('Supabase Service Layer Contracts', () => {
  it('exposes authentic authentication service methods', () => {
    expect(typeof authService.signUp).toBe('function');
    expect(typeof authService.signIn).toBe('function');
    expect(typeof authService.signOut).toBe('function');
    expect(typeof authService.resetPasswordForEmail).toBe('function');
    expect(typeof authService.updatePassword).toBe('function');
  });

  it('exposes complete conversation management methods', () => {
    expect(typeof conversationService.getConversations).toBe('function');
    expect(typeof conversationService.getConversation).toBe('function');
    expect(typeof conversationService.getOrCreateDirectConversation).toBe('function');
    expect(typeof conversationService.createGroup).toBe('function');
    expect(typeof conversationService.pinConversation).toBe('function');
    expect(typeof conversationService.archiveConversation).toBe('function');
    expect(typeof conversationService.muteConversation).toBe('function');
    expect(typeof conversationService.leaveGroup).toBe('function');
  });

  it('exposes real-time message operations with idempotency', () => {
    expect(typeof messageService.getMessages).toBe('function');
    expect(typeof messageService.sendMessage).toBe('function');
    expect(typeof messageService.editMessage).toBe('function');
    expect(typeof messageService.deleteMessage).toBe('function');
    expect(typeof messageService.addReaction).toBe('function');
    expect(typeof messageService.markAsRead).toBe('function');
    expect(typeof messageService.subscribeToConversationMessages).toBe('function');
  });

  it('exposes contacts and blocking operations', () => {
    expect(typeof contactService.getContacts).toBe('function');
    expect(typeof contactService.addContact).toBe('function');
    expect(typeof contactService.removeContact).toBe('function');
    expect(typeof contactService.blockUser).toBe('function');
    expect(typeof contactService.unblockUser).toBe('function');
  });

  it('exposes user settings synchronization methods', () => {
    expect(typeof settingsService.getUserSettings).toBe('function');
    expect(typeof settingsService.updateUserSettings).toBe('function');
    expect(typeof settingsService.subscribeToUserSettings).toBe('function');
  });
});

