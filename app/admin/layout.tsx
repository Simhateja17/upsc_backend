'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardHeader from '@/components/DashboardHeader';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, refreshUser } = useAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    // If role is missing (e.g. fallback user from Supabase session),
    // try refreshing user data from the backend before redirecting.
    if (!user?.role && !checked) {
      setChecked(true);
      refreshUser();
      return;
    }
    if (user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, user?.role, router, checked, refreshUser]);

  if (isLoading || (!checked && !user?.role)) {
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
