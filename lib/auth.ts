import { supabase } from './supabase';
import api from './api';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  role?: string;
  createdAt?: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
}

export interface AuthResponse {
  user: User;
  session: Session | null;
  requiresEmailVerification?: boolean;
}

export interface SignupData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

// Token storage — used by services.ts to attach Bearer tokens to API calls
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const getStoredTokens = (): { accessToken: string | null; refreshToken: string | null } => {
  if (typeof window === 'undefined') return { accessToken: null, refreshToken: null };
  return {
    accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  };
};

export const storeTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearTokens = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// Sync the authenticated Supabase user into our Prisma database
async function syncUserToBackend(accessToken: string, refreshToken: string): Promise<AuthResponse | null> {
  try {
    const res = await api.post<AuthResponse>('/auth/callback', { accessToken, refreshToken });
    return res.data ?? null;
  } catch {
    return null;
  }
}

export const authService = {
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { first_name: data.firstName, last_name: data.lastName },
      },
    });

    if (error) throw new Error(error.message);
    if (!authData.user) throw new Error('Failed to create account');

    // Session is null when Supabase requires email confirmation
    if (!authData.session) {
      return {
        user: {
          id: authData.user.id,
          email: authData.user.email!,
          firstName: data.firstName,
          lastName: data.lastName,
        },
        session: null,
        requiresEmailVerification: true,
      };
    }

    storeTokens(authData.session.access_token, authData.session.refresh_token ?? '');
    
    // Sync with backend, but don't fail if backend is unavailable
    const synced = await syncUserToBackend(authData.session.access_token, authData.session.refresh_token ?? '').catch(err => {
      console.warn('Backend sync failed during signup:', err);
      return null;
    });

    return synced ?? {
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        firstName: data.firstName,
        lastName: data.lastName,
      },
      session: {
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token ?? '',
        expiresAt: authData.session.expires_at,
      },
    };
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) throw new Error(error.message);
    if (!authData.user || !authData.session) throw new Error('Login failed');

    storeTokens(authData.session.access_token, authData.session.refresh_token ?? '');
    
    // Sync with backend, but don't fail if backend is unavailable
    const synced = await syncUserToBackend(authData.session.access_token, authData.session.refresh_token ?? '').catch(err => {
      console.warn('Backend sync failed during login:', err);
      return null;
    });

    return synced ?? {
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        firstName: authData.user.user_metadata?.first_name,
        lastName: authData.user.user_metadata?.last_name,
        avatarUrl: authData.user.user_metadata?.avatar_url,
      },
      session: {
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token ?? '',
        expiresAt: authData.session.expires_at,
      },
    };
  },

  loginWithGoogle: async (): Promise<void> => {
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : 'http://localhost:3000/auth/callback';

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (error) throw new Error(error.message);
    // Browser redirects to Google — no return value
  },

  logout: async (): Promise<void> => {
    const { accessToken } = getStoredTokens();
    if (accessToken) {
      try {
        await api.post('/auth/logout', {}, { token: accessToken });
      } catch {
        // Ignore logout errors
      }
    }
    await supabase.auth.signOut();
    clearTokens();
  },

  getMe: async (): Promise<{ user: User }> => {
    const { accessToken } = getStoredTokens();
    if (!accessToken) throw new Error('No access token');
    const response = await api.get<{ user: User }>('/auth/me', { token: accessToken });
    return response.data!;
  },

  refreshToken: async (): Promise<Session> => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) throw new Error('Session refresh failed');
    storeTokens(data.session.access_token, data.session.refresh_token ?? '');
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token ?? '',
      expiresAt: data.session.expires_at,
    };
  },

  // Legacy — kept for backward compat, now replaced by loginWithGoogle
  getGoogleAuthUrl: async (): Promise<string> => {
    const response = await api.get<{ url: string }>('/auth/google');
    return response.data!.url;
  },

  handleOAuthCallback: async (accessToken: string, refreshToken: string): Promise<AuthResponse> => {
    storeTokens(accessToken, refreshToken);
    const response = await api.post<AuthResponse>('/auth/callback', { accessToken, refreshToken });
    return response.data!;
  },
};

export default authService;
