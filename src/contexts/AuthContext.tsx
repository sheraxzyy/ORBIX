import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { authService, type SignUpOptions } from '@/services/authService';
import { profileService, type Profile } from '@/services/profileService';
import { settingsService, type UserSettings } from '@/services/settingsService';
import type { AppRole } from '@/types/database.types';
import { useTheme, type Theme } from './ThemeContext';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  settings: UserSettings | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isGuest: boolean;
  userRole: AppRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isModerator: boolean;
  isDeactivated: boolean;
  isAuthModalOpen: boolean;
  authModalAction: string | null;
  openAuthModal: (actionDesc?: string) => void;
  closeAuthModal: () => void;
  signIn: (email: string, pass: string) => Promise<{ user: User | null; session: Session | null }>;
  signUp: (
    optionsOrEmail: SignUpOptions | string,
    pass?: string,
    username?: string,
    name?: string
  ) => Promise<{ user: User | null; session: Session | null }>;
  signOut: (scope?: 'global' | 'local' | 'others') => Promise<void>;
  deactivateAccount: () => Promise<void>;
  reactivateAccount: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [userRole, setUserRole] = useState<AppRole>('user');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalAction, setAuthModalAction] = useState<string | null>(null);

  const { setTheme } = useTheme();
  const activeUserIdRef = useRef<string | null>(null);

  const openAuthModal = useCallback((actionDesc?: string) => {
    setAuthModalAction(actionDesc || null);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setAuthModalAction(null);
  }, []);

  const loadUserData = useCallback(
    async (targetUser: User) => {
      const userId = targetUser.id;
      activeUserIdRef.current = userId;

      try {
        const [profResult, userSetsResult, roleRes] = await Promise.allSettled([
          profileService.getProfile(userId),
          settingsService.getUserSettings(userId),
          supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
        ]);

        if (activeUserIdRef.current !== userId) return;

        // 1. Profile with self-healing fallback
        let prof: Profile | null =
          profResult.status === 'fulfilled' ? profResult.value : null;

        if (!prof) {
          const fallbackUsername =
            (targetUser.user_metadata?.username as string) ||
            targetUser.email?.split('@')[0] ||
            `user_${userId.slice(0, 6)}`;
          const fallbackDisplay =
            (targetUser.user_metadata?.display_name as string) ||
            (targetUser.user_metadata?.full_name as string) ||
            fallbackUsername;

          prof = await profileService.ensureProfile(userId, {
            username: fallbackUsername,
            display_name: fallbackDisplay,
          });
        }

        if (prof && activeUserIdRef.current === userId) {
          setProfile(prof);
        }

        // 2. Settings with fallback
        let userSets: UserSettings | null =
          userSetsResult.status === 'fulfilled' ? userSetsResult.value : null;

        if (!userSets) {
          userSets = await settingsService
            .updateUserSettings(userId, { theme: 'dark' })
            .catch(() => null);
        }

        if (userSets && activeUserIdRef.current === userId) {
          setSettings(userSets);
          if (userSets.theme) {
            setTheme(userSets.theme as Theme);
          }
        }

        // 3. User Role
        if (
          roleRes.status === 'fulfilled' &&
          roleRes.value?.data?.role &&
          activeUserIdRef.current === userId
        ) {
          setUserRole(roleRes.value.data.role as AppRole);
        } else if (activeUserIdRef.current === userId) {
          setUserRole('user');
        }
      } catch (err) {
        console.error('Error synchronizing user profile, settings and role:', err);
      }
    },
    [setTheme]
  );

  useEffect(() => {
    let isMounted = true;

    // Single source of truth: Supabase onAuthStateChange automatically resolves initial session
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!isMounted) return;

      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await loadUserData(currentUser);
      } else {
        activeUserIdRef.current = null;
        setProfile(null);
        setSettings(null);
        setUserRole('user');
      }

      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  // Realtime Cross-Device Settings Sync Subscription
  useEffect(() => {
    if (!user) return;

    const unsubscribe = settingsService.subscribeToUserSettings(user.id, (newSettings) => {
      setSettings(newSettings);
      if (newSettings.theme) {
        setTheme(newSettings.theme as Theme);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user, setTheme]);

  const signIn = async (email: string, pass: string) => {
    const data = await authService.signIn(email, pass);
    if (data.user) {
      setUser(data.user);
      setSession(data.session);
      await loadUserData(data.user);
    }
    return data;
  };

  const signUp = async (
    optionsOrEmail: SignUpOptions | string,
    pass?: string,
    username?: string,
    name?: string
  ) => {
    const data = await authService.signUp(optionsOrEmail, pass, username, name);
    if (data.session && data.user) {
      setUser(data.user);
      setSession(data.session);
      await loadUserData(data.user);
    }
    return data;
  };

  const signOut = async (scope?: 'global' | 'local' | 'others') => {
    activeUserIdRef.current = null;
    await authService.signOut(scope ? { scope } : undefined);
    setUser(null);
    setSession(null);
    setProfile(null);
    setSettings(null);
    setUserRole('user');
  };

  const deactivateAccount = async () => {
    await authService.deactivateAccount();
    if (user) {
      await loadUserData(user);
    }
  };

  const reactivateAccount = async () => {
    await authService.reactivateAccount();
    if (user) {
      await loadUserData(user);
    }
  };

  const deleteAccount = async (password: string) => {
    activeUserIdRef.current = null;
    await authService.deleteAccount(password);
    setUser(null);
    setSession(null);
    setProfile(null);
    setSettings(null);
    setUserRole('user');
  };

  const resendVerification = async (email: string) => {
    await authService.resendVerificationEmail(email);
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserData(user);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;
    const updated = await settingsService.updateUserSettings(user.id, newSettings);
    setSettings(updated);
    if (updated.theme) {
      setTheme(updated.theme as Theme);
    }
  };

  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isSuperAdmin = userRole === 'super_admin';
  const isModerator =
    userRole === 'moderator' || userRole === 'admin' || userRole === 'super_admin';
  const isDeactivated = profile?.status === 'deactivated';
  const isGuest = !user && !isLoading;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        settings,
        isAuthenticated: Boolean(user),
        isLoading,
        isGuest,
        userRole,
        isAdmin,
        isSuperAdmin,
        isModerator,
        isDeactivated,
        isAuthModalOpen,
        authModalAction,
        openAuthModal,
        closeAuthModal,
        signIn,
        signUp,
        signOut,
        deactivateAccount,
        reactivateAccount,
        deleteAccount,
        resendVerification,
        refreshProfile,
        updateSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
