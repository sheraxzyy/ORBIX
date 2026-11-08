import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/authService';
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
  isAuthModalOpen: boolean;
  authModalAction: string | null;
  openAuthModal: (actionDesc?: string) => void;
  closeAuthModal: () => void;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, username: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
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

  const openAuthModal = useCallback((actionDesc?: string) => {
    setAuthModalAction(actionDesc || null);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setAuthModalAction(null);
  }, []);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      const [prof, userSets, roleRes] = await Promise.all([
        profileService.getProfile(userId).catch(() => null),
        settingsService.getUserSettings(userId).catch(() => null),
        (async () => {
          try {
            const res = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', userId)
              .single();
            return res;
          } catch {
            return null;
          }
        })(),
      ]);

      if (prof) setProfile(prof);
      if (userSets) {
        setSettings(userSets);
        if (userSets.theme) {
          setTheme(userSets.theme as Theme);
        }
      }
      if (roleRes && 'data' in roleRes && roleRes.data?.role) {
        setUserRole(roleRes.data.role as AppRole);
      } else {
        setUserRole('user');
      }
    } catch (err) {
      console.error('Error loading user profile, settings and role:', err);
    }
  }, [setTheme]);

  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      setSession(initSession);
      setUser(initSession?.user ?? null);
      if (initSession?.user) {
        loadUserData(initSession.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // 2. Auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        loadUserData(currentSession.user.id);
      } else {
        setProfile(null);
        setSettings(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  // 3. Realtime Cross-Device Settings Sync Subscription
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
      await loadUserData(data.user.id);
    }
  };

  const signUp = async (email: string, pass: string, username: string, name: string) => {
    const data = await authService.signUp(email, pass, username, name);
    if (data.user) {
      await loadUserData(data.user.id);
    }
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setSettings(null);
    setUserRole('user');
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserData(user.id);
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
  const isModerator = userRole === 'moderator' || userRole === 'admin' || userRole === 'super_admin';
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
        isAuthModalOpen,
        authModalAction,
        openAuthModal,
        closeAuthModal,
        signIn,
        signUp,
        signOut,
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

