'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService, User, storeTokens, clearTokens, SignupData, LoginData } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

/** Build a fallback User from the Supabase session when /auth/me is unavailable */
function userFromSession(session: Session): User {
  const { user: su } = session;
  return {
    id: su.id,
    email: su.email ?? '',
    firstName: su.user_metadata?.first_name,
    lastName: su.user_metadata?.last_name,
    avatarUrl: su.user_metadata?.avatar_url,
    role: su.app_metadata?.role ?? su.user_metadata?.role,
  };
}

/** Try getMe(), retry once after a short delay on failure */
async function fetchMe(): Promise<User> {
  try {
    const { user } = await authService.getMe();
    return user;
  } catch {
    // Retry once — token may not have been fully propagated yet
    await new Promise(r => setTimeout(r, 500));
    const { user } = await authService.getMe();
    return user;
  }
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        clearTokens();
        setUser(null);
        setIsLoading(false);
        return;
      }
      storeTokens(session.access_token, session.refresh_token ?? '');
      const freshUser = await fetchMe();
      setUser(freshUser);
    } catch {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        setUser(prev => prev ?? userFromSession(currentSession));
      } else {
        clearTokens();
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Use Supabase's onAuthStateChange as the single source of truth.
    // It fires INITIAL_SESSION on page load (including hard refresh) with the
    // current session — no race condition with manual token checks.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        // Just update stored tokens — don't re-fetch user or risk clearing state
        if (session) {
          storeTokens(session.access_token, session.refresh_token ?? '');
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        clearTokens();
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (session) {
        storeTokens(session.access_token, session.refresh_token ?? '');
        try {
          const freshUser = await fetchMe();
          setUser(freshUser);
        } catch {
          // getMe failed even after retry — fall back to Supabase session data
          // (includes role from app_metadata) so user isn't logged out.
          setUser(prev => prev ?? userFromSession(session));
        }
      } else {
        clearTokens();
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (data: LoginData) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data);
      setUser(response.user);
      // If role is missing from callback response, fetch it from /auth/me
      if (!response.user.role) {
        try {
          const { user: fullUser } = await authService.getMe();
          setUser(fullUser);
        } catch {
          // Keep the user from login response — role will be fetched by onAuthStateChange
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: SignupData) => {
    setIsLoading(true);
    try {
      const response = await authService.signup(data);
      if (response.session) {
        setUser(response.user);
      }
      // If requiresEmailVerification, don't set user — login page shows success tab
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    // This triggers a browser redirect to Google — no loading state needed
    await authService.loginWithGoogle();
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        loginWithGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
