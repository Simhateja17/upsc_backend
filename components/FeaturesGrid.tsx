'use client';

import React from 'react';
import Image from 'next/image';
import { useCmsContent } from '@/hooks/useCmsContent';

const defaultFeatures = [
  {
    title: 'AI Powered Learning',
    description: 'Get instant feedback on answers, personalized study recommendations, and intelligent doubt solving.',
    icon: '/icon-ai-learning.png',
    useImage: true,
  },
  {
    title: 'Live Community',
    description: 'Connect with toppers, join study groups, and participate in discussions with 15,000+ aspirants.',
    icon: 'community',
    useImage: false,
  },
  {
    title: 'Learn Anywhere',
    description: 'Access platform on mobile, tablet, and desktop with seamless sync across devices.',
    icon: '/icon-video.png',
    useImage: true,
  },
  {
    title: 'Personalized Schedule',
    description: 'AI-generated study plan that adapts to your progress and learning pace.',
    icon: '/icon-schedule.png',
    useImage: true,
  },
  {
    title: 'Smart Analytics',
    description: 'Track progress, identify weak areas, and get predictive analysis of your UPSC readiness.',
    icon: 'analytics',
    useImage: false,
  },
  {
    title: 'Interactive Video Lessons',
    description: 'Learn from India\'s best UPSC educators with interactive quizzes and notes.',
    icon: '/icon-mobile.png',
    useImage: true,
  },
];

const defaults = {
  features_title: 'Your Complete UPSC Preparation Ecosystem',
  features: defaultFeatures,
};

// SVG Icons for missing images
const CommunityIcon = () => (
  <svg width="45" height="45" viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="45" height="45" rx="8" fill="#FFF3E0"/>
    <path d="M22.5 20C24.71 20 26.5 18.21 26.5 16C26.5 13.79 24.71 12 22.5 12C20.29 12 18.5 13.79 18.5 16C18.5 18.21 20.29 20 22.5 20Z" fill="#FF9800"/>
    <path d="M30 20C31.66 20 33 18.66 33 17C33 15.34 31.66 14 30 14C28.34 14 27 15.34 27 17C27 18.66 28.34 20 30 20Z" fill="#FF9800"/>
    <path d="M15 20C16.66 20 18 18.66 18 17C18 15.34 16.66 14 15 14C13.34 14 12 15.34 12 17C12 18.66 13.34 20 15 20Z" fill="#FF9800"/>
    <path d="M22.5 22C19.24 22 16.5 24.24 16.5 27V32H28.5V27C28.5 24.24 25.76 22 22.5 22Z" fill="#FF9800"/>
    <path d="M30 22C29.46 22 28.96 22.08 28.5 22.21C29.38 23.39 30 24.86 30 26.5V32H36V27.5C36 24.46 33.31 22 30 22Z" fill="#FF9800" opacity="0.7"/>
    <path d="M15 22C11.69 22 9 24.46 9 27.5V32H15V26.5C15 24.86 15.62 23.39 16.5 22.21C16.04 22.08 15.54 22 15 22Z" fill="#FF9800" opacity="0.7"/>
  </svg>
);

const AnalyticsIcon = () => (
  <svg width="45" height="45" viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="45" height="45" rx="8" fill="#E8F5E9"/>
    <path d="M12 32H33V34H12V32Z" fill="#4CAF50"/>
    <path d="M14 26H18V31H14V26Z" fill="#4CAF50"/>
    <path d="M20 22H24V31H20V22Z" fill="#4CAF50"/>
    <path d="M26 18H30V31H26V18Z" fill="#4CAF50"/>
    <path d="M14 20L20 14L24 18L32 10" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M27 10H32V15" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FeaturesGrid = () => {
  const { get } = useCmsContent('home', defaults);
  const features = get('features', defaultFeatures);

  return (
    <section className="w-full py-[clamp(3rem,5.208vw,6.25rem)]" style={{ background: '#F4F6FA' }}>
      <div className="w-full max-w-[85rem] mx-auto px-[clamp(2rem,6vw,8rem)]">
        {/* Section Heading */}
        <h2
          className="font-lora font-bold text-center text-[#1C2E45] leading-[150%] mb-[clamp(2rem,4.167vw,5rem)]"
          style={{
            fontSize: 'clamp(2rem, 3.385vw, 4.063rem)',
            letterSpacing: '0.01em',
          }}
        >
          {get('features_title')}
        </h2>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[clamp(1.25rem,1.5vw,1.75rem)]">
          {features.map((feature: any, index: number) => (
            <div
              key={index}
              className="card-elevated rounded-[1rem] p-[clamp(1.25rem,1.5vw,1.75rem)] flex flex-col"
              style={{
                minHeight: 'clamp(14rem, 16vw, 18rem)',
                boxShadow: '4px 4px 4px 0px #00000040',
              }}
            >
              {/* Icon */}
              <div className="w-[clamp(2rem,2vw,2.5rem)] h-[clamp(2rem,2vw,2.5rem)] mb-[clamp(0.75rem,1vw,1.25rem)] flex-shrink-0">
                {feature.useImage ? (
                  <Image
                    src={feature.icon}
                    alt={feature.title}
                    width={40}
                    height={40}
                    className="w-full h-full object-contain"
                  />
                ) : feature.icon === 'community' ? (
                  <CommunityIcon />
                ) : (
                  <AnalyticsIcon />
                )}
              </div>

              {/* Title */}
              <h3
                className="font-jakarta font-bold text-[#1C2E45] leading-[140%] mb-[clamp(0.5rem,0.75vw,1rem)]"
                style={{
                  fontSize: 'clamp(1rem, 1.25vw, 1.5rem)',
                  letterSpacing: '-0.03rem',
                }}
              >
                {feature.title}
              </h3>

              {/* Description */}
              <p
                className="font-inter font-normal text-black leading-[160%]"
                style={{
                  fontSize: 'clamp(0.75rem, 0.95vw, 1.125rem)',
                }}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
