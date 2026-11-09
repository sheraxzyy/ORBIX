import { describe, it, expect } from 'vitest';
import { authService } from '@/services/authService';
import { profileService, RESERVED_USERNAMES } from '@/services/profileService';
import { isSupabaseConfigured } from '@/lib/supabase';

describe('ORBIX Authentication Contracts & Robustness', () => {
  describe('authService API Contracts', () => {
    it('exposes all mandatory authentication methods', () => {
      expect(typeof authService.signUp).toBe('function');
      expect(typeof authService.signIn).toBe('function');
      expect(typeof authService.signOut).toBe('function');
      expect(typeof authService.resetPasswordForEmail).toBe('function');
      expect(typeof authService.updatePassword).toBe('function');
      expect(typeof authService.resendVerificationEmail).toBe('function');
      expect(typeof authService.formatAuthError).toBe('function');
    });

    it('accurately maps Supabase and network errors to friendly user messages', () => {
      expect(authService.formatAuthError(new Error('Invalid login credentials'))).toBe(
        'Incorrect email or password.'
      );
      expect(authService.formatAuthError(new Error('Email not confirmed'))).toBe(
        'Please verify your email address before continuing.'
      );
      expect(authService.formatAuthError(new Error('User already registered'))).toBe(
        'An account with this email address already exists. Please sign in or reset your password.'
      );
      expect(authService.formatAuthError(new Error('Password should be at least 8 characters'))).toBe(
        'Your password does not meet the security requirements.'
      );
      expect(authService.formatAuthError(new Error('profiles_username_unique violation'))).toBe(
        'This username is already taken. Please choose another.'
      );
      expect(authService.formatAuthError(new Error('Failed to fetch'))).toBe(
        'Unable to connect. Please check your internet connection and try again.'
      );
      expect(
        authService.formatAuthError(
          new Error('For security purposes, you can only request this once every 60 seconds')
        )
      ).toBe('Rate limit reached. Please wait a moment before trying again.');
      expect(authService.formatAuthError(new Error('Auth session missing'))).toBe(
        'Your session has expired. Please log in again.'
      );
      expect(authService.formatAuthError(new Error('Token has expired or is invalid'))).toBe(
        'This verification or recovery link has expired or is invalid. Please request a new one.'
      );
    });
  });

  describe('Registration & Profile Guardrails', () => {
    it('enforces reserved usernames blacklist', () => {
      const sensitiveHandles = ['admin', 'orbix', 'system', 'moderator', 'root', 'api'];
      for (const handle of sensitiveHandles) {
        expect(RESERVED_USERNAMES).toContain(handle);
      }
    });

    it('rejects empty or reserved usernames in isUsernameAvailable', async () => {
      expect(await profileService.isUsernameAvailable('')).toBe(false);
      expect(await profileService.isUsernameAvailable('   ')).toBe(false);
      expect(await profileService.isUsernameAvailable('admin')).toBe(false);
      expect(await profileService.isUsernameAvailable('ORBIX')).toBe(false);
      expect(await profileService.isUsernameAvailable('system')).toBe(false);
    });

    it('normalizes handles to lowercase', async () => {
      // Reserved check is case-insensitive
      expect(await profileService.isUsernameAvailable('AdMiN')).toBe(false);
      expect(await profileService.isUsernameAvailable('OrbiX')).toBe(false);
    });
  });

  describe('Environment Configuration Integrity', () => {
    it('detects Supabase environment configuration status correctly', () => {
      expect(typeof isSupabaseConfigured).toBe('boolean');
    });

    it('never leaks secret service role keys in client-side environment', () => {
      // In Vite client environment, SUPABASE_SERVICE_ROLE_KEY must never start with VITE_
      const clientEnv = import.meta.env;
      expect(clientEnv.VITE_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
      expect(clientEnv.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    });
  });
});

