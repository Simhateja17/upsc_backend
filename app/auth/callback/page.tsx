'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { storeTokens } from '@/lib/auth';
import api from '@/lib/api';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase automatically exchanges the code in the URL for a session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          setErrorMsg(error?.message || 'OAuth sign-in failed. Please try again.');
          setStatus('error');
          return;
        }

        storeTokens(session.access_token, session.refresh_token ?? '');

        // Sync user into our Prisma database and get role
        let userRole = 'user';
        try {
          const res = await api.post<{ user: { role?: string } }>('/auth/callback', {
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          });
          userRole = res.data?.user?.role || 'user';
        } catch {
          // User might already exist — try getMe to get role
          try {
            const meRes = await api.get<{ user: { role?: string } }>('/auth/me', {
              headers: { Authorization: `Bearer ${session.access_token}` } as any,
            });
            userRole = meRes.data?.user?.role || 'user';
          } catch {
            // Continue with default role
          }
        }

        if (userRole !== 'admin') {
          const createdAtMs = session.user?.created_at ? new Date(session.user.created_at).getTime() : Number.NaN;
          const lastSignInAtMs = session.user?.last_sign_in_at ? new Date(session.user.last_sign_in_at).getTime() : Number.NaN;
          const isLikelyFirstGoogleSignIn =
            Number.isFinite(createdAtMs) &&
            Number.isFinite(lastSignInAtMs) &&
            Math.abs(lastSignInAtMs - createdAtMs) < 120000;

          if (!isLikelyFirstGoogleSignIn) {
            localStorage.setItem('rwj_has_logged_in', '1');
          }
          sessionStorage.setItem('rwj_login_success', '1');
        }
        router.replace(userRole === 'admin' ? '/admin' : '/dashboard');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
        setStatus('error');
      }
    };

    handleCallback();
  }, [router]);

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F9FAFB]">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm" style={{ maxWidth: 400 }}>
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="font-inter font-semibold text-[#111827] mb-2">Sign-in failed</h2>
          <p className="text-sm text-[#6B7280] mb-6">{errorMsg}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-5 py-2 rounded-lg text-white font-inter font-medium text-sm"
            style={{ background: '#6366F1' }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F9FAFB]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-inter text-[#374151] text-sm">Completing sign-in...</p>
      </div>
    </div>
  );
}
