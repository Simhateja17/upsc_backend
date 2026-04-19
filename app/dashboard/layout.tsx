'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';

const HIDE_SIDEBAR_ROUTES = ['/dashboard/profile', '/dashboard/settings', '/dashboard/billing', '/dashboard/feedback'];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const didTryRefreshRef = useRef(false);
  const hideSidebar = HIDE_SIDEBAR_ROUTES.includes(pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isLoading || isAuthenticated) return;

    // Avoid false redirects when the Supabase session exists but `user` hasn't hydrated yet.
    // Try once to refresh user from session before sending to /login.
    if (!didTryRefreshRef.current) {
      didTryRefreshRef.current = true;
      refreshUser().catch(() => {
        // ignore and fall through to redirect on next render
      });
      return;
    }

    // Double-check Supabase session before redirecting — prevents
    // race conditions where user state hasn't hydrated yet.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        // Session exists but user state hasn't caught up — refresh again
        refreshUser();
      }
    });
  }, [isLoading, isAuthenticated, refreshUser, router]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        {!hideSidebar && (
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
