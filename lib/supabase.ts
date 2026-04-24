import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Suppress console errors for token refresh failures (e.g., offline mode)
    flowType: 'pkce',
  },
});

// Suppress Supabase auth retry error spam in console
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const msg = args[0]?.toString() ?? '';
  if (msg.includes('ERR_INTERNET_DISCONNECTED') || msg.includes('Failed to fetch') || msg.includes('AuthRetryableFetchError')) {
    return; // Silently ignore network-related auth errors
  }
  originalConsoleError.apply(console, args);
};
