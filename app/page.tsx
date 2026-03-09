'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import FeaturesGrid from '@/components/FeaturesGrid';
import JeetAI from '@/components/JeetAI';
import DashboardPreview from '@/components/DashboardPreview';
import Mentorship from '@/components/Mentorship';
import StudyPlanner from '@/components/StudyPlanner';
import LiveStudyRoom from '@/components/LiveStudyRoom';
import Testimonials from '@/components/Testimonials';
import DownloadApp from '@/components/DownloadApp';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(user?.role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [isAuthenticated, isLoading, user, router]);

  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <FeaturesGrid />
      <JeetAI />
      <DashboardPreview />
      <Mentorship />
      <StudyPlanner />
      <LiveStudyRoom />
      <DownloadApp />
      <Testimonials />
      <FAQ />
      <Footer />
    </main>
  );
}
