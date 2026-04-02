'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(user?.role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [isAuthenticated, isLoading, user, router]);

  return (
    <main className="min-h-screen w-full overflow-hidden" style={{ background: '#FFFFFF' }}>
      <iframe
        src="/riswithjeet-landing.html"
        title="RiseWithJeet Landing"
        style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
      />
    </main>
  );
}
