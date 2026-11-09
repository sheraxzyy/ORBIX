import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface SignUpOptions {
  email: string;
  password: string;
  username: string;
  displayName: string;
  inviteCode?: string;
}

export const authService = {
  async signUp(optionsOrEmail: SignUpOptions | string, password?: string, username?: string, displayName?: string) {
    let emailVal: string;
    let passVal: string;
    let userVal: string;
    let nameVal: string;
    let inviteCodeVal: string | undefined;

    if (typeof optionsOrEmail === 'object') {
      emailVal = optionsOrEmail.email;
      passVal = optionsOrEmail.password;
      userVal = optionsOrEmail.username;
      nameVal = optionsOrEmail.displayName;
      inviteCodeVal = optionsOrEmail.inviteCode;
    } else {
      emailVal = optionsOrEmail;
      passVal = password || '';
      userVal = username || '';
      nameVal = displayName || '';
    }

    const cleanEmail = emailVal.trim().toLowerCase();
    const cleanUsername = userVal.trim().toLowerCase();
    const cleanDisplayName = nameVal.trim() || cleanUsername;

    const redirectUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: passVal,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: cleanUsername,
          display_name: cleanDisplayName,
          full_name: cleanDisplayName,
          ...(inviteCodeVal ? { invite_code: inviteCodeVal.trim() } : {}),
        },
      },
    });

    if (error) throw error;

    // Supabase Auth Email Enumeration Protection:
    // If an account with this email already exists, Supabase returns a dummy user with an empty identities array []
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('An account with this email address already exists. Please sign in or reset your password.');
    }

    return data;
  },

  async signIn(email: string, pass: string) {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass,
    });
    if (error) throw error;
    return data;
  },

  async signOut(options?: { scope?: 'global' | 'local' | 'others' }) {
    const { error } = await supabase.auth.signOut(options);
    if (error) {
      console.warn('Sign out warning:', error.message);
    }
  },

  async resetPasswordForEmail(email: string) {
    const cleanEmail = email.trim().toLowerCase();
    const redirectUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : undefined;

    const { data, error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    });
    if (error) throw error;
    return data;
  },

  async updatePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
    return data;
  },

  async updateEmail(newEmail: string) {
    const cleanEmail = newEmail.trim().toLowerCase();
    const redirectUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;

    const { data, error } = await supabase.auth.updateUser(
      { email: cleanEmail },
      { emailRedirectTo: redirectUrl }
    );
    if (error) throw error;
    return data;
  },

  async resendVerificationEmail(email: string) {
    const cleanEmail = email.trim().toLowerCase();
    const redirectUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;

    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    if (error) throw error;
    return data;
  },

  async deactivateAccount(): Promise<void> {
    const { error } = await supabase.rpc('deactivate_account');
    if (error) throw error;
  },

  async reactivateAccount(): Promise<void> {
    const { error } = await supabase.rpc('reactivate_account');
    if (error) throw error;
  },

  async deleteAccount(password: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) throw new Error('Not authenticated');

    // Re-verify credentials before critical deletion
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (signInErr) {
      throw new Error('Incorrect password. Please verify your current password to confirm account deletion.');
    }

    const { error: deleteErr } = await supabase.rpc('delete_user_account');
    if (deleteErr) throw deleteErr;

    await supabase.auth.signOut();
  },

  async getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getCurrentUser(): Promise<User | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user;
  },

  formatAuthError(err: unknown): string {
    if (!err) return 'An unexpected error occurred.';
    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();

    if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
      return 'Incorrect email or password.';
    }
    if (lower.includes('email not confirmed')) {
      return 'Please verify your email address before continuing.';
    }
    if (
      lower.includes('user already registered') ||
      lower.includes('already exists') ||
      lower.includes('identity already registered') ||
      lower.includes('already in use')
    ) {
      return 'An account with this email address already exists. Please sign in or reset your password.';
    }
    if (
      lower.includes('password') &&
      (lower.includes('least') || lower.includes('short') || lower.includes('weak') || lower.includes('security'))
    ) {
      return 'Your password does not meet the security requirements.';
    }
    if (
      lower.includes('username') &&
      (lower.includes('taken') || lower.includes('exists') || lower.includes('unique') || lower.includes('profiles_username_unique'))
    ) {
      return 'This username is already taken. Please choose another.';
    }
    if (
      lower.includes('failed to fetch') ||
      lower.includes('networkerror') ||
      lower.includes('connection') ||
      lower.includes('network request failed')
    ) {
      return 'Unable to connect. Please check your internet connection and try again.';
    }
    if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('security purposes')) {
      return 'Rate limit reached. Please wait a moment before trying again.';
    }
    if (lower.includes('session') && (lower.includes('missing') || lower.includes('expired'))) {
      return 'Your session has expired. Please log in again.';
    }
    if (lower.includes('otp') || lower.includes('token has expired') || lower.includes('token is invalid')) {
      return 'This verification or recovery link has expired or is invalid. Please request a new one.';
    }

    return msg;
  },
};
