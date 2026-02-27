'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

// SVG Icons for each feature
const MainsEvaluatorIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#F5C67B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UPSCGPTIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 10H8.01M12 10H12.01M16 10H16.01M9 16H5C3.89543 16 3 15.1046 3 14V6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V14C21 15.1046 20.1046 16 19 16H14L9 21V16Z" stroke="#F5C67B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TestGeneratorIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="#F5C67B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CurrentAffairsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 20H5C3.89543 20 3 19.1046 3 18V6C3 4.89543 3.89543 4 5 4H15L21 10V18C21 19.1046 20.1046 20 19 20Z" stroke="#F5C67B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 20V14H21M15 4V10H21M7 13H13M7 17H11" stroke="#F5C67B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const featureIcons = [MainsEvaluatorIcon, UPSCGPTIcon, TestGeneratorIcon, CurrentAffairsIcon];

const JeetAI = () => {
  const features = [
    {
      title: 'Mains Evaluator',
      description: 'Evaluate Mains answers within minutes',
    },
    {
      title: 'UPSC GPT',
      description: '',
    },
    {
      title: 'Test generators',
      description: '',
    },
    {
      title: 'Current Affairs',
      description: '',
    },
  ];

  return (
    <section 
      className="relative w-full overflow-hidden"
      style={{
        minHeight: 'clamp(500px, 70.1vh, 757px)',
        background: 'linear-gradient(115.34deg, #0E182D 2.01%, #17223E 79.49%)',
      }}
    >
      {/* Content Container - increased side padding for more blank space */}
      <div 
        className="relative z-10 w-full mx-auto"
        style={{
          maxWidth: '1400px',
          paddingTop: 'clamp(2rem, 6%, 60px)',
          paddingLeft: 'clamp(2rem, 8vw, 120px)',
          paddingRight: 'clamp(2rem, 8vw, 120px)',
          paddingBottom: 'clamp(2rem, 8%, 80px)',
        }}
      >
        
        {/* Section Title - centered, consistent with other sections */}
        <div 
          className="flex justify-center"
          style={{
            marginBottom: 'clamp(2.5rem, 6vw, 80px)',
          }}
        >
          <h2 
            className="font-lora font-bold text-center text-white leading-[150%]"
            style={{
              fontSize: 'clamp(2rem, 3.385vw, 4.063rem)',
              letterSpacing: '0.01em',
            }}
          >
            Experience Jeet AI in Action
          </h2>
        </div>

        {/* Main Content Grid */}
        <div className="flex flex-col lg:flex-row items-stretch gap-[clamp(2rem, 5vw, 5rem)]">
          
          {/* Left Side - Feature List with divider lines */}
          <div 
            className="w-full lg:w-[35%]"
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {features.map((feature, index) => {
              const IconComponent = featureIcons[index];
              return (
                <div 
                  key={index}
                  className="flex items-start cursor-pointer group"
                  style={{
                    gap: 'clamp(0.75rem, 1vw, 1rem)',
                    paddingTop: index === 0 ? '0' : 'clamp(1rem, 2vw, 28px)',
                    paddingBottom: 'clamp(1rem, 2vw, 28px)',
                    borderBottom: index < features.length - 1 ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                  }}
                >
                  {/* Feature Icon */}
                  <div 
                    className="flex-shrink-0 flex items-center justify-center rounded-lg"
                    style={{
                      width: 'clamp(36px, 2.5vw, 44px)',
                      height: 'clamp(36px, 2.5vw, 44px)',
                      background: 'rgba(245, 198, 123, 0.1)',
                    }}
                  >
                    <IconComponent />
                  </div>
                  
                  {/* Text Content */}
                  <div>
                    <h3 
                      className="font-plus-jakarta font-bold text-[#DED4C4] group-hover:text-[#F5C67B] transition-colors"
                      style={{
                        fontSize: 'clamp(0.95rem, 1.25vw, 22px)',
                        lineHeight: '140%',
                        letterSpacing: '-0.5px',
                      }}
                    >
                      {feature.title}
                    </h3>
                    {feature.description && (
                      <p 
                        className="font-inter font-normal"
                        style={{
                          fontSize: 'clamp(0.8rem, 1vw, 16px)',
                          lineHeight: '160%',
                          color: 'rgba(222, 212, 196, 0.7)',
                          marginTop: 'clamp(0.25rem, 0.4vw, 0.4rem)',
                        }}
                      >
                        {feature.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Side - Preview Image */}
          <div className="w-full lg:w-[65%] flex justify-center lg:justify-end">
            <div
              className="relative rounded-2xl overflow-hidden w-full"
              style={{
                height: '100%',
                minHeight: 'clamp(280px, 35vw, 500px)',
                boxShadow: '0px 20px 50px rgba(0, 0, 0, 0.3)',
              }}
            >
              <Image
                src="/jeet-ai-preview.jpg"
                alt="Jeet AI Preview"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JeetAI;
