'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardHeader from '@/components/DashboardHeader';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, refreshUser } = useAuth();
  const router = useRouter();
  const [roleVerified, setRoleVerified] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // If user already has admin role, we're good
    if (user?.role === 'admin') {
      setRoleVerified(true);
      return;
    }

    // If role is missing or not admin, try refreshing from backend once
    if (!roleVerified) {
      let cancelled = false;
      refreshUser().then(() => {
        if (!cancelled) setRoleVerified(true);
      });
      return () => { cancelled = true; };
    }

    // After refresh attempt, if still not admin, redirect
    if (roleVerified && user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, user?.role, router, roleVerified, refreshUser]);

  if (isLoading || (!roleVerified && isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F3F4F6' }}>
        <div className="text-center">
          <div
            className="inline-block w-10 h-10 border-4 border-[#667eea] border-t-transparent rounded-full animate-spin"
          />
          <p className="mt-4 text-[#6B7280] font-inter" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>
            Loading admin panel...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <>
      <DashboardHeader />
      <div className="flex min-h-[calc(100vh-clamp(90px,5.78vw,111px))]">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto" style={{ background: '#F3F4F6' }}>
          <div className="p-[clamp(1.5rem,2.5vw,3rem)]">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
