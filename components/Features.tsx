'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const features = [
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

// Quote Icon for testimonial
const QuoteIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 18H12L8 26H14L18 18V6H6V18Z" fill="#1A9E75"/>
    <path d="M20 18H26L22 26H28L32 18V6H20V18Z" fill="#1A9E75"/>
  </svg>
);

// User Icon
const UserIcon = () => (
  <div className="w-10 h-10 rounded-full bg-[#1A9E75] flex items-center justify-center">
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 10C12.21 10 14 8.21 14 6C14 3.79 12.21 2 10 2C7.79 2 6 3.79 6 6C6 8.21 7.79 10 10 10Z" fill="white"/>
      <path d="M10 12C6.13 12 3 14.13 3 17V18H17V17C17 14.13 13.87 12 10 12Z" fill="white"/>
    </svg>
  </div>
);

// Feature icons for Jeet Path
const SessionIcon = () => (
  <div className="w-6 h-6 flex items-center justify-center">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="16" height="16" rx="3" fill="#1A9E75"/>
      <rect x="3" y="4" width="4" height="3" fill="white"/>
      <rect x="9" y="4" width="4" height="3" fill="white"/>
      <rect x="3" y="9" width="4" height="3" fill="white"/>
      <rect x="9" y="9" width="4" height="3" fill="white"/>
    </svg>
  </div>
);

const ChartIcon = () => (
  <div className="w-6 h-6 flex items-center justify-center">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="16" height="16" rx="3" fill="#1A9E75"/>
      <path d="M3 12L6 8L9 10L13 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

const PlanIcon = () => (
  <div className="w-6 h-6 flex items-center justify-center">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="16" height="16" rx="3" fill="#F5A623"/>
      <path d="M4 8L7 11L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

const Features = () => {
  return (
    <>
      {/* Main Features Section */}
      <section className="w-full bg-[#F8F6F4] py-[clamp(3rem,5.208vw,6.25rem)]">
        <div className="w-full max-w-[120rem] mx-auto px-[clamp(1.5rem,4vw,5rem)]">
          {/* Section Heading */}
          <h2 
            className="font-lora font-bold text-center text-[#1C2E45] leading-[150%] mb-[clamp(2rem,4.167vw,5rem)]"
            style={{
              fontSize: 'clamp(2rem, 3.385vw, 4.063rem)',
              letterSpacing: '0.01em',
            }}
          >
            Everything You Need to Crack UPSC
          </h2>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[clamp(1.5rem,2.083vw,2.5rem)]">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-[1.25rem] border border-[#E7E0DA] p-[clamp(1.5rem,2.083vw,2.5rem)] flex flex-col transition-all duration-300 hover:shadow-lg hover:border-[#D0C9C3]"
                style={{
                  minHeight: 'clamp(18rem, 20.417vw, 24.5rem)',
                }}
              >
                {/* Icon */}
                <div className="w-[clamp(2.5rem,2.344vw,2.813rem)] h-[clamp(2.5rem,2.344vw,2.813rem)] mb-[clamp(1rem,1.25vw,1.5rem)] flex-shrink-0">
                  {feature.useImage ? (
                    <Image
                      src={feature.icon}
                      alt={feature.title}
                      width={45}
                      height={45}
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
                  className="font-jakarta font-bold text-[#1C2E45] leading-[140%] mb-[clamp(0.75rem,1.042vw,1.25rem)]"
                  style={{
                    fontSize: 'clamp(1.25rem, 1.563vw, 1.875rem)',
                    letterSpacing: '-0.0625rem',
                  }}
                >
                  {feature.title}
                </h3>

                {/* Description */}
                <p 
                  className="font-inter font-normal text-black leading-[160%]"
                  style={{
                    fontSize: 'clamp(0.875rem, 1.25vw, 1.5rem)',
                  }}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Your Smart Study Planner Section */}
      <section className="w-full bg-[#F8F6F4] py-[clamp(3rem,5.208vw,6.25rem)]">
        <div className="w-full max-w-[120rem] mx-auto px-[clamp(1.5rem,4vw,5rem)]">
          {/* Section Title - 70px at 1920px, responsive with clamp */}
          <h2 
            className="font-lora font-bold text-center text-black mb-[clamp(2.5rem,4.167vw,5rem)]"
            style={{
              // 70px at 1920px = 3.646vw, min 36px for smaller screens, max 70px
              fontSize: 'clamp(2.25rem, 3.646vw, 4.375rem)',
              lineHeight: '150%',
              letterSpacing: '-0.015em',
            }}
          >
            Your Smart Study Planner
          </h2>

          {/* Content Grid */}
          <div className="flex flex-col lg:flex-row gap-[clamp(2rem,4vw,5rem)] items-center justify-center">
            {/* Left - Daily Plan Card */}
            <div 
              className="w-full lg:w-[45%] max-w-[500px] bg-white rounded-2xl p-[clamp(1.5rem,2vw,2.5rem)] shadow-lg"
              style={{
                border: '1px solid #E7E0DA',
              }}
            >
              {/* Mac-style window dots */}
              <div className="flex items-center gap-2 mb-[clamp(1rem,1.5vw,1.5rem)]">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
                <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
              </div>

              {/* Card Title */}
              <div className="flex items-center justify-center gap-2 mb-[clamp(1.25rem,2vw,2rem)]">
                <span className="text-xl">📅</span>
                <h3 
                  className="font-inter font-semibold text-[#1C2E45]"
                  style={{
                    fontSize: 'clamp(1rem, 1.25vw, 1.5rem)',
                  }}
                >
                  Your Daily Plan
                </h3>
              </div>

              {/* Time Blocks */}
              <div className="space-y-[clamp(0.75rem,1vw,1rem)]">
                {/* Morning */}
                <div 
                  className="rounded-lg p-[clamp(0.75rem,1vw,1rem)]"
                  style={{
                    backgroundColor: '#E3F2FD',
                    borderLeft: '4px solid #2196F3',
                  }}
                >
                  <p 
                    className="font-inter font-semibold text-[#1C2E45]"
                    style={{
                      fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)',
                    }}
                  >
                    Morning (6-9 AM)
                  </p>
                  <p 
                    className="font-inter text-[#5A6B7D]"
                    style={{
                      fontSize: 'clamp(0.75rem, 0.833vw, 1rem)',
                    }}
                  >
                    NCERT Reading + Notes
                  </p>
                </div>

                {/* Afternoon */}
                <div 
                  className="rounded-lg p-[clamp(0.75rem,1vw,1rem)]"
                  style={{
                    backgroundColor: '#FFF8E1',
                    borderLeft: '4px solid #FFC107',
                  }}
                >
                  <p 
                    className="font-inter font-semibold text-[#1C2E45]"
                    style={{
                      fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)',
                    }}
                  >
                    Afternoon (2-5 PM)
                  </p>
                  <p 
                    className="font-inter text-[#5A6B7D]"
                    style={{
                      fontSize: 'clamp(0.75rem, 0.833vw, 1rem)',
                    }}
                  >
                    Answer Writing Practice
                  </p>
                </div>

                {/* Evening */}
                <div 
                  className="rounded-lg p-[clamp(0.75rem,1vw,1rem)]"
                  style={{
                    backgroundColor: '#E8F5E9',
                    borderLeft: '4px solid #4CAF50',
                  }}
                >
                  <p 
                    className="font-inter font-semibold text-[#1C2E45]"
                    style={{
                      fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)',
                    }}
                  >
                    Evening (7-10 PM)
                  </p>
                  <p 
                    className="font-inter text-[#5A6B7D]"
                    style={{
                      fontSize: 'clamp(0.75rem, 0.833vw, 1rem)',
                    }}
                  >
                    Current Affairs + Revision
                  </p>
                </div>
              </div>
            </div>

            {/* Right - Features */}
            <div className="w-full lg:w-[45%] max-w-[500px]">
              <h3 
                className="font-plus-jakarta font-bold text-[#1C2E45] mb-[clamp(1rem,1.5vw,1.5rem)]"
                style={{
                  fontSize: 'clamp(1.5rem, 2.083vw, 2.5rem)',
                  lineHeight: '140%',
                }}
              >
                Never Miss a Day with Jeet Planner
              </h3>

              {/* Feature List */}
              <div className="space-y-[clamp(0.875rem,1.25vw,1.25rem)]">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#1A9E75] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p 
                    className="font-inter text-[#1C2E45]"
                    style={{
                      fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)',
                      lineHeight: '160%',
                    }}
                  >
                    Personalized study schedules based on your goals and timeline
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#1A9E75] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p 
                    className="font-inter text-[#1C2E45]"
                    style={{
                      fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)',
                      lineHeight: '160%',
                    }}
                  >
                    Integrated with all 10 modules for seamless planning
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#1A9E75] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p 
                    className="font-inter text-[#1C2E45]"
                    style={{
                      fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)',
                      lineHeight: '160%',
                    }}
                  >
                    Track progress and adaptive daily adjustments
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#1A9E75] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p 
                    className="font-inter text-[#1C2E45]"
                    style={{
                      fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)',
                      lineHeight: '160%',
                    }}
                  >
                    Balance between reading, practice, and revision
                  </p>
                </div>
              </div>

              {/* CTA Button */}
              <button 
                className="mt-[clamp(1.5rem,2vw,2.5rem)] bg-[#F5A623] hover:bg-[#E09915] text-white font-semibold rounded-lg transition-colors"
                style={{
                  padding: 'clamp(0.75rem, 1vw, 1rem) clamp(1.5rem, 2vw, 2rem)',
                  fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)',
                }}
              >
                Start Planning Free →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Personalized Dashboard Preview Section */}
      <section className="w-full bg-white py-[clamp(2rem,4vw,5rem)]">
        <div className="w-full max-w-[120rem] mx-auto px-[clamp(1.5rem,4vw,5rem)]">
          {/* Section Title with border */}
          <div className="flex justify-center mb-[clamp(2rem,4vw,5rem)]">
            <div 
              className="inline-flex items-center justify-center rounded-lg"
              style={{
                border: '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: '0px 4px 9.7px 0px rgba(0, 0, 0, 0.03) inset',
                padding: 'clamp(1rem, 2vw, 2rem) clamp(2rem, 4vw, 4rem)',
                // width: 1148px at 1920px = 59.8%
                width: 'clamp(300px, 59.8%, 1148px)',
              }}
            >
              <h2 
                className="font-lora font-bold text-center"
                style={{
                  // 70px at 1920px = 3.646vw
                  fontSize: 'clamp(1.75rem, 3.646vw, 70px)',
                  lineHeight: '150%',
                  letterSpacing: '-1.5%',
                  color: '#00052E',
                }}
              >
                Personalized Dashboard Preview
              </h2>
            </div>
          </div>

          {/* Dashboard Preview Placeholder */}
          <div 
            className="w-full rounded-2xl bg-white border border-[#E7E0DA] overflow-hidden"
            style={{
              minHeight: 'clamp(300px, 35vw, 600px)',
            }}
          >
            {/* Add dashboard preview content here */}
          </div>
        </div>
      </section>

      {/* Personalized Mentorship Section */}
      <section className="w-full bg-white py-[clamp(2rem,4vw,5rem)]">
        <div className="w-full max-w-[120rem] mx-auto px-[clamp(1.5rem,4vw,5rem)]">
          {/* Section Title */}
          <div className="flex justify-center mb-[clamp(1.5rem,3vw,3rem)]">
            <h2
              className="font-lora font-bold text-center"
              style={{
                fontSize: 'clamp(1.75rem, 3.646vw, 70px)',
                lineHeight: '150%',
                letterSpacing: '-1.5%',
                color: '#00052E',
              }}
            >
              Personalized Mentorship
            </h2>
          </div>

          {/* Subtitle */}
          <p 
            className="text-center text-[#5A6B7D] mb-[clamp(1rem,1.5vw,1.5rem)]"
            style={{
              fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)',
            }}
          >
            Guidance from experienced mentors who understand the UPSC journey
          </p>

          {/* Accent line */}
          <div className="flex justify-center mb-[clamp(2rem,3vw,4rem)]">
            <div className="w-16 h-1 bg-[#1A9E75] rounded-full"></div>
          </div>

          {/* Mentorship Content Grid */}
          <div className="flex flex-col lg:flex-row gap-[clamp(2rem,4vw,5rem)] items-start">
            {/* Left - Testimonial Card */}
            <div 
              className="w-full lg:w-[45%] bg-white rounded-2xl p-[clamp(1.5rem,2.5vw,3rem)] shadow-sm"
              style={{
                border: '1px solid #E7E0DA',
              }}
            >
              {/* Quote Icon */}
              <div className="mb-[clamp(1rem,1.5vw,1.5rem)]">
                <QuoteIcon />
              </div>

              {/* Quote Text */}
              <p 
                className="font-inter italic text-[#1C2E45] mb-[clamp(1.5rem,2vw,2.5rem)]"
                style={{
                  fontSize: 'clamp(0.875rem, 1.146vw, 1.375rem)',
                  lineHeight: '170%',
                }}
              >
                The difference between aspirants and officers is often not knowledge but strategy. We help you build the right strategy, maintain consistency, and overcome plateaus.
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <UserIcon />
                <div>
                  <p 
                    className="font-inter font-semibold text-[#1C2E45]"
                    style={{
                      fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)',
                    }}
                  >
                    Jeet Sharma
                  </p>
                  <p 
                    className="font-inter text-[#5A6B7D]"
                    style={{
                      fontSize: 'clamp(0.75rem, 0.833vw, 1rem)',
                    }}
                  >
                    Founder & Mentor, Ex-Civil Servant
                  </p>
                </div>
              </div>
            </div>

            {/* Right - Jeet Path Features */}
            <div className="w-full lg:w-[55%]">
              <h3 
                className="font-plus-jakarta font-bold text-[#1C2E45] mb-[clamp(0.75rem,1vw,1rem)]"
                style={{
                  fontSize: 'clamp(1.25rem, 1.563vw, 1.875rem)',
                }}
              >
                Jeet Path: Your Personalized Roadmap
              </h3>

              <p 
                className="text-[#5A6B7D] mb-[clamp(1.5rem,2vw,2.5rem)]"
                style={{
                  fontSize: 'clamp(0.75rem, 0.938vw, 1.125rem)',
                  lineHeight: '160%',
                }}
              >
                Every aspirant is unique. Our mentorship program adapts to your strengths, weaknesses, and learning pace.
              </p>

              {/* Feature List */}
              <div className="space-y-[clamp(1rem,1.5vw,1.5rem)]">
                {/* Weekly Sessions */}
                <div className="flex items-start gap-3">
                  <SessionIcon />
                  <div>
                    <p 
                      className="font-inter font-semibold text-[#1C2E45]"
                      style={{
                        fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)',
                      }}
                    >
                      Weekly One-on-One Sessions
                    </p>
                    <p 
                      className="text-[#5A6B7D]"
                      style={{
                        fontSize: 'clamp(0.75rem, 0.833vw, 1rem)',
                      }}
                    >
                      Personalized feedback and strategy adjustments
                    </p>
                  </div>
                </div>

                {/* Progress Analytics */}
                <div className="flex items-start gap-3">
                  <ChartIcon />
                  <div>
                    <p 
                      className="font-inter font-semibold text-[#1C2E45]"
                      style={{
                        fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)',
                      }}
                    >
                      Progress Analytics Dashboard
                    </p>
                    <p 
                      className="text-[#5A6B7D]"
                      style={{
                        fontSize: 'clamp(0.75rem, 0.833vw, 1rem)',
                      }}
                    >
                      Visualize your preparation with detailed insights
                    </p>
                  </div>
                </div>

                {/* Dynamic Study Plan */}
                <div className="flex items-start gap-3">
                  <PlanIcon />
                  <div>
                    <p 
                      className="font-inter font-semibold text-[#1C2E45]"
                      style={{
                        fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)',
                      }}
                    >
                      Dynamic Study Plan Adjustments
                    </p>
                    <p 
                      className="text-[#5A6B7D]"
                      style={{
                        fontSize: 'clamp(0.75rem, 0.833vw, 1rem)',
                      }}
                    >
                      Your plan evolves based on performance and goals
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <Link href="/dashboard/free-trial">
                <button
                  className="mt-[clamp(1.5rem,2.5vw,3rem)] flex items-center gap-2 bg-[#1C2E45] hover:bg-[#2A4060] text-white rounded-lg transition-colors"
                  style={{
                    padding: 'clamp(0.75rem, 1vw, 1rem) clamp(1.5rem, 2vw, 2rem)',
                    fontSize: 'clamp(0.875rem, 1.042vw, 1.25rem)',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 2L9 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18 2L12 18L9 11L2 8L18 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Schedule Mentor Session
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Features;
