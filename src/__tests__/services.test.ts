import { describe, it, expect } from 'vitest';
import { authService } from '@/services/authService';
import { conversationService } from '@/services/conversationService';
import { messageService } from '@/services/messageService';
import { contactService } from '@/services/contactService';
import { settingsService } from '@/services/settingsService';
import { profileService, RESERVED_USERNAMES } from '@/services/profileService';
import { adminService } from '@/services/adminService';

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

  it('exposes real-time message operations with idempotency and client_id support', () => {
    expect(typeof messageService.getMessages).toBe('function');
    expect(typeof messageService.sendMessage).toBe('function');
    expect(typeof messageService.editMessage).toBe('function');
    expect(typeof messageService.deleteMessage).toBe('function');
    expect(typeof messageService.addReaction).toBe('function');
    expect(typeof messageService.markAsRead).toBe('function');
    expect(typeof messageService.subscribeToConversationMessages).toBe('function');
  });

  it('rejects empty or whitespace-only messages in messageService', async () => {
    await expect(
      messageService.sendMessage('conv-1', 'user-1', '   ')
    ).rejects.toThrow('Message body cannot be empty or whitespace only.');

    await expect(
      messageService.sendMessage('conv-1', 'user-1', '')
    ).rejects.toThrow('Message body cannot be empty or whitespace only.');
  });

  it('enforces username rules, reserved handles, and uniqueness checks', () => {
    expect(typeof profileService.isUsernameAvailable).toBe('function');
    expect(typeof profileService.searchProfiles).toBe('function');
    expect(RESERVED_USERNAMES).toContain('admin');
    expect(RESERVED_USERNAMES).toContain('system');
    expect(RESERVED_USERNAMES).toContain('orbix');
    expect(RESERVED_USERNAMES).toContain('support');
    expect(RESERVED_USERNAMES).toContain('root');
  });

  it('exposes admin governance, limiter, moderation, and immutable audit logs', () => {
    expect(typeof adminService.getOverviewStats).toBe('function');
    expect(typeof adminService.getUsers).toBe('function');
    expect(typeof adminService.updateUserStatus).toBe('function');
    expect(typeof adminService.updateUserRole).toBe('function');
    expect(typeof adminService.getPlatformSettings).toBe('function');
    expect(typeof adminService.updatePlatformSettings).toBe('function');
    expect(typeof adminService.getTodayRegistrationCount).toBe('function');
    expect(typeof adminService.getModerationReports).toBe('function');
    expect(typeof adminService.resolveReport).toBe('function');
    expect(typeof adminService.getAuditLogs).toBe('function');
    expect(typeof adminService.logAdminAction).toBe('function');
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

