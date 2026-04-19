'use client';

import React from 'react';
import { useCmsContent } from '@/hooks/useCmsContent';

const defaults = {
  hero_badge: "🏆 India's #1 AI-Powered UPSC Platform",
  hero_title: 'Everything you need to crack UPSC, <span class="text-[#FFD170]">Simplified</span>',
  hero_subtitle: "Trusted by 15,000+ aspirants preparing with AI-powered learning, daily MCQs practice, instant mains answer evaluation, expert mentorship, and smart revision tools.",
  hero_cta_primary: "Start Your Free Trial",
  hero_cta_secondary: "Watch Platform Demo",
};

const Hero = () => {
  const { get } = useCmsContent('home', defaults);

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden pt-[73px]">
      {/* Background Image - covers both header and hero */}
      <div
        className="absolute inset-0 z-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/hero-bg.jpg)',
          top: '-73px',
          height: 'calc(100% + 73px)',
        }}
      />

      {/* Content Container */}
      <div className="relative z-[2] w-full max-w-[120rem] mx-auto px-[clamp(2rem,5.208vw,6.25rem)] py-[clamp(4rem,8.333vw,10rem)]">
        <div className="flex flex-col items-center justify-center space-y-[clamp(2rem,3.125vw,3.75rem)]">
          {/* Platform Badge */}
          <div
            className="inline-block px-8 py-3 rounded-full backdrop-blur-xl border-2"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              borderColor: 'rgba(245, 199, 93, 0.4)',
              boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.15), inset 0 -1px 0 0 rgba(255,255,255,0.05), 0 0 20px rgba(245, 199, 93, 0.15)',
            }}
          >
            <p className="text-[clamp(0.875rem,0.938vw,1.125rem)] text-white font-sf-pro font-medium">
              {get('hero_badge')}
            </p>
          </div>

          {/* Hero Heading Container */}
          <div
            className="relative max-w-[80.625rem] w-full"
          >
            {/* Heading with gradient text - no box */}
            <div className="text-center">
              <h1
                className="font-sf-pro font-bold text-center text-white"
                style={{
                  fontSize: 'clamp(2rem, 3.333vw, 64px)',
                  lineHeight: '150%',
                  letterSpacing: '-1.5%',
                }}
                dangerouslySetInnerHTML={{ __html: get('hero_title') }}
              />

              <p
                className="mt-[clamp(1rem,1.563vw,1.875rem)] font-geist font-bold text-center text-white/80 mx-auto"
                style={{
                  fontSize: 'clamp(1rem, 1.8vw, 32px)',
                  lineHeight: '150%',
                  letterSpacing: '-1.5%',
                  maxWidth: '100%',
                }}
              >
                {get('hero_subtitle')}
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-[clamp(1.5rem,2.083vw,2.5rem)] flex-wrap justify-center">
            {/* Primary CTA */}
            <button
              className="group relative overflow-hidden rounded-[clamp(0.625rem,0.781vw,0.938rem)] bg-cta-yellow hover:bg-[#FFC557] transition-all duration-300 transform hover:scale-105"
              style={{
                padding: 'clamp(0.625rem, 0.521vw, 0.625rem) clamp(1.25rem, 1.042vw, 1.25rem)',
                boxShadow: '0px 4px 17.1px 0px rgba(255, 255, 255, 0.06) inset',
              }}
            >
              <span
                className="font-sf-pro font-semibold leading-[110%] tracking-[-0.015em] text-black"
                style={{
                  fontSize: 'clamp(1.5rem, 2.083vw, 2.5rem)',
                }}
              >
                {get('hero_cta_primary')}
              </span>
            </button>

            {/* Secondary CTA */}
            <button
              className="group relative overflow-hidden rounded-[clamp(0.625rem,0.781vw,0.938rem)] backdrop-blur-md transition-all duration-300 transform hover:scale-105"
              style={{
                padding: 'clamp(0.625rem, 0.521vw, 0.625rem) clamp(1.25rem, 1.042vw, 1.25rem)',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 0 rgba(255,255,255,0.1)',
              }}
            >
              <span
                className="font-sf-pro font-semibold leading-[110%] tracking-[-0.015em] text-white"
                style={{
                  fontSize: 'clamp(1.5rem, 2.083vw, 2.5rem)',
                }}
              >
                {get('hero_cta_secondary')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
