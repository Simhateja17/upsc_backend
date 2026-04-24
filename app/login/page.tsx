'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

const featureCards = [
  { label: 'Daily Mains Challenge', icon: '/icons/dashboard/mains.png' },
  { label: '1-on-1 Mentorship',     icon: '/icon-mentorship.png' },
  { label: 'Study Planner',         icon: '/icon-study-planner.png' },
  { label: 'Mock Tests',            icon: '/icon-mock-test.png' },
  { label: 'Performance Analytics', icon: '/icon-analytics.png' },
  { label: 'Smart Revision Tools',  icon: '/icons/dashboard/brain.png' },
];

const avatarColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, signup, loginWithGoogle, isAuthenticated, isLoading: authLoading, user } = useAuth();

  // Get initial tab from URL query param
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'signup' ? 'signup' : 'login';

  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'success'>(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Email autocomplete state
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [loginEmailSuggestions, setLoginEmailSuggestions] = useState<string[]>([]);
  const [showLoginEmailSuggestions, setShowLoginEmailSuggestions] = useState(false);
  const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];

  const handleSignupEmailChange = (value: string) => {
    setSignupEmail(value);
    
    // Show suggestions only if user has typed something and doesn't already have @
    if (value && !value.includes('@')) {
      const suggestions = commonDomains.map(domain => `${value}@${domain}`);
      setEmailSuggestions(suggestions);
      setShowEmailSuggestions(true);
    } else if (value.includes('@')) {
      const [localPart, domainPart] = value.split('@');
      if (domainPart && localPart) {
        // Filter domains that match what user is typing
        const matchingDomains = commonDomains.filter(domain => 
          domain.toLowerCase().startsWith(domainPart.toLowerCase())
        );
        if (matchingDomains.length > 0) {
          const suggestions = matchingDomains.map(domain => `${localPart}@${domain}`);
          setEmailSuggestions(suggestions);
          setShowEmailSuggestions(true);
        } else {
          setShowEmailSuggestions(false);
        }
      } else {
        setShowEmailSuggestions(false);
      }
    } else {
      setShowEmailSuggestions(false);
    }
  };

  const selectEmailSuggestion = (suggestion: string) => {
    setSignupEmail(suggestion);
    setShowEmailSuggestions(false);
  };

  const handleLoginEmailChange = (value: string) => {
    setLoginEmail(value);
    
    // Show suggestions only if user has typed something and doesn't already have @
    if (value && !value.includes('@')) {
      const suggestions = commonDomains.map(domain => `${value}@${domain}`);
      setLoginEmailSuggestions(suggestions);
      setShowLoginEmailSuggestions(true);
    } else if (value.includes('@')) {
      const [localPart, domainPart] = value.split('@');
      if (domainPart && localPart) {
        // Filter domains that match what user is typing
        const matchingDomains = commonDomains.filter(domain => 
          domain.toLowerCase().startsWith(domainPart.toLowerCase())
        );
        if (matchingDomains.length > 0) {
          const suggestions = matchingDomains.map(domain => `${localPart}@${domain}`);
          setLoginEmailSuggestions(suggestions);
          setShowLoginEmailSuggestions(true);
        } else {
          setShowLoginEmailSuggestions(false);
        }
      } else {
        setShowLoginEmailSuggestions(false);
      }
    } else {
      setShowLoginEmailSuggestions(false);
    }
  };

  const selectLoginEmailSuggestion = (suggestion: string) => {
    setLoginEmail(suggestion);
    setShowLoginEmailSuggestions(false);
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push(user?.role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [isAuthenticated, authLoading, user, router]);

  // Update tab when URL changes
  useEffect(() => {
    if (tabParam === 'signup') {
      setActiveTab('signup');
    } else if (tabParam === 'login') {
      setActiveTab('login');
    }
  }, [tabParam]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ email: loginEmail, password: loginPassword });
      // Redirect immediately after login succeeds — don't wait for useEffect
      router.replace('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials') || msg.toLowerCase().includes('wrong password')) {
        setError('Incorrect email or password. Please try again.');
      } else if (msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('not confirmed')) {
        setError('Please verify your email first. Check your inbox for a confirmation link.');
      } else if (msg.toLowerCase().includes('rate limit')) {
        setError('Too many login attempts. Please wait a few minutes and try again.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      await signup({
        email: signupEmail,
        password: signupPassword,
        firstName: signupFirstName,
        lastName: signupLastName,
        phone: signupPhone || undefined,
      });
      setActiveTab('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('email rate')) {
        setError('Too many signup attempts. Please wait a few minutes and try again, or use Google sign-up.');
      } else if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        setError('This email is already registered. Please log in instead.');
        setActiveTab('login');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setError(null);
      await loginWithGoogle();
      // Browser redirects to Google — execution stops here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Google login');
    }
  };

  const goToDashboard = () => {
    router.push(user?.role === 'admin' ? '/admin' : '/dashboard');
  };

  return (
    <div className="flex w-full min-h-screen" style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        .login-left-panel { width: 478px; flex-shrink: 0; }
        .login-right-panel { padding-top: 72px; }
        .login-form-container { width: 448px; }
        @media (max-width: 1023px) {
          .login-left-panel { display: none !important; }
          .login-right-panel {
            padding-top: 40px;
            padding-bottom: 40px;
            padding-left: 24px;
            padding-right: 24px;
            align-items: center;
            overflow-y: auto;
          }
          .login-form-container {
            width: 100% !important;
            max-width: 480px;
          }
        }
        @media (max-width: 479px) {
          .login-right-panel {
            padding-top: 24px;
            padding-bottom: 24px;
            padding-left: 16px;
            padding-right: 16px;
          }
          .login-form-container {
            max-width: 100%;
          }
        }
      `}</style>
      {/* ── LEFT PANEL ── */}
      <div
        className="relative flex-shrink-0 overflow-hidden login-left-panel"
        style={{
          minHeight: '100vh',
          background: '#0F1C2E',
        }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.1,
            backgroundImage:
              'linear-gradient(180deg, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Logo / Branding — absolutely positioned */}
        <div
          className="relative z-10 flex items-center gap-3"
          style={{ position: 'absolute', top: 31, left: 26 }}
        >
          <Image
            src="/footer-logo.png"
            alt="RiseWithJeet"
            width={42}
            height={48}
            style={{ objectFit: 'contain' }}
          />
          <div>
            <div
              style={{
                fontFamily: 'Inter',
                fontWeight: 700,
                fontSize: 18,
                lineHeight: '28px',
                letterSpacing: 0,
                color: '#FFFFFF',
              }}
            >
              Rise<span style={{ color: '#D9A84F' }}>WithJeet</span>
            </div>
            <div
              style={{
                fontFamily: 'Inter',
                fontWeight: 400,
                fontSize: 10,
                lineHeight: '15px',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: '#99A1AF',
              }}
            >
              India&apos;s Premier UPSC Platform
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10" style={{ width: 382, top: 120, left: 48, position: 'absolute' }}>

          {/* Trusted by badge */}
          <div className="flex items-center gap-2" style={{ marginBottom: 20 }}>
            <div style={{ width: 32, height: 1, background: '#FF6900', flexShrink: 0 }} />
            <span
              style={{
                fontFamily: 'Inter',
                fontWeight: 400,
                fontSize: 12,
                lineHeight: '16px',
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                color: '#99A1AF',
              }}
            >
              Trusted by 15,000+ Aspirants
            </span>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontFamily: 'Inter',
                fontWeight: 700,
                fontSize: 36,
                lineHeight: '45px',
                color: '#FFFFFF',
              }}
            >
              Your UPSC Journey
            </div>
            <div
              style={{
                fontFamily: 'Inter',
                fontWeight: 700,
                fontSize: 36,
                lineHeight: '45px',
                color: '#FFFFFF',
              }}
            >
              starts{' '}
              <span
                style={{
                  fontStyle: 'italic',
                  color: '#D9A84F',
                }}
              >
                right here.
              </span>
            </div>
          </div>

          {/* Subtitle */}
          <div style={{ marginBottom: 36 }}>
            {[
              'A comprehensive platform offering all resources',
              'necessary to excel in the UPSC exam. Including Daily',
              'Mains Challenge, Syllabus Tracker, Study Planner,',
              'Smart Revision Tools, Simplified Video Lectures,',
              'Mock Tests, detailed Performance Analytics,',
              '1-on-1 Mentorship and structured Previous Year',
              'Questions.',
            ].map((line, i) => (
              <div
                key={i}
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 400,
                  fontSize: 14,
                  lineHeight: '22.75px',
                  color: '#99A1AF',
                }}
              >
                {line}
              </div>
            ))}
          </div>

          {/* Feature cards grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginBottom: 32,
            }}
          >
            {featureCards.map((card) => (
              <div
                key={card.label}
                style={{
                  background: '#1A2738',
                  borderRadius: 10,
                  borderTop: '0.8px solid #364153',
                  padding: '16px',
                  minHeight: 98,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: '#2A3847',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Image src={card.icon} alt={card.label} width={24} height={24} style={{ objectFit: 'contain' }} />
                </div>
                <span
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 600,
                    fontSize: 14,
                    lineHeight: '20px',
                    color: '#FFFFFF',
                  }}
                >
                  {card.label}
                </span>
              </div>
            ))}
          </div>

          {/* Avatars + count */}
          <div className="flex items-center gap-3">
            <div className="flex">
              {avatarColors.map((color, i) => (
                <div
                  key={i}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: color,
                    border: '2px solid #0F1C2E',
                    marginLeft: i === 0 ? 0 : -8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#fff',
                  }}
                >
                  {i < 4 ? ['AK', 'PS', 'RV', 'MF'][i] : '+15k'}
                </div>
              ))}
            </div>
            <div>
              <span
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#D9A84F',
                }}
              >
                15,000+ Aspirants
              </span>
              <div
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 400,
                  fontSize: 11,
                  color: '#99A1AF',
                }}
              >
                actively preparing on this platform
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div
        className="flex-1 flex flex-col items-center login-right-panel"
        style={{ background: '#F9FAFB', minHeight: '100vh' }}
      >
        {/* Single centered container for tab + form */}
        <div className="login-form-container">

        {/* Form area */}
        <div
          className="flex flex-col"
        >

        {/* Error message */}
        {error && (
          <div
            style={{
              background: '#FEE2E2',
              border: '1px solid #EF4444',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
              color: '#DC2626',
              fontSize: 14,
              fontFamily: 'Inter',
            }}
          >
            {error}
          </div>
        )}

        {/* ── SUCCESS SCREEN ── */}
        {activeTab === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Celebration image */}
            <Image src="/success-celebration.png" alt="You're in!" width={100} height={100} style={{ objectFit: 'contain', marginBottom: 16 }} />

            {/* You're in! heading */}
            <h1
              style={{
                fontFamily: 'Inter',
                fontWeight: 700,
                fontStyle: 'italic',
                fontSize: 36,
                lineHeight: '40px',
                color: '#0A0A0A',
                textAlign: 'center',
                margin: 0,
                marginBottom: 12,
              }}
            >
              You&apos;re in!
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontFamily: 'Inter',
                fontWeight: 400,
                fontSize: 14,
                lineHeight: '22.75px',
                color: '#6A7282',
                textAlign: 'center',
                margin: 0,
                marginBottom: 28,
                maxWidth: 362,
              }}
            >
              Your account is ready. Time to start your UPSC preparation with India&apos;s best AI-powered tools.
            </p>

            {/* What's unlocked card */}
            <div
              style={{
                width: '100%',
                borderRadius: 16,
                background: '#0F1C2E',
                padding: '24px',
                marginBottom: 20,
                boxSizing: 'border-box',
              }}
            >
              {/* Header row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <Image src="/icon-unlocked.png" alt="" width={16} height={16} style={{ objectFit: 'contain' }} />
                <span
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 600,
                    fontSize: 12,
                    lineHeight: '16px',
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    color: '#D9A84F',
                  }}
                >
                  What&apos;s unlocked for you
                </span>
              </div>

              {/* Feature list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { icon: '/icon-pyq.png', text: 'Daily Mains Challenge and Instant Evaluation' },
                  { icon: '/icon-mentorship.png', text: '10,000+ PYQ questions' },
                  { icon: '/icon-dashboard.png', text: 'Personal Performance dashboard' },
                  { icon: '/icon-streak.png', text: 'Daily streak, Syllabus and Study Planner tracking' },
                ].map((item) => (
                  <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Image src={item.icon} alt="" width={28} height={28} style={{ objectFit: 'contain', flexShrink: 0 }} />
                    <span
                      style={{
                        fontFamily: 'Inter',
                        fontWeight: 400,
                        fontSize: 14,
                        lineHeight: '20px',
                        color: '#FFFFFF',
                      }}
                    >
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Go to Dashboard button */}
            <button
              onClick={goToDashboard}
              style={{
                width: '100%',
                height: 52,
                borderRadius: 16,
                background: '#10B981',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Inter',
                fontWeight: 600,
                fontSize: 14,
                lineHeight: '20px',
                color: '#FFFFFF',
                textAlign: 'center',
                boxShadow: '0px 10px 15px -3px rgba(0,0,0,0.10), 0px 4px 6px -4px rgba(0,0,0,0.10)',
              }}
            >
              Go to My Dashboard →
            </button>
          </div>
        )}

        {/* ── SIGNUP FORM ── */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignup}>
            {/* Heading */}
            <h1
              style={{
                fontFamily: 'Inter',
                fontWeight: 700,
                fontStyle: 'italic',
                fontSize: 30,
                lineHeight: '36px',
                color: '#0A0A0A',
                margin: 0,
                marginBottom: 8,
                letterSpacing: 0,
              }}
            >
              Welcome to <span style={{ color: '#D9A84F' }}>RiseWithJeet!</span>
            </h1>
            <p
              style={{
                fontFamily: 'Inter',
                fontWeight: 400,
                fontSize: 14,
                lineHeight: '20px',
                color: '#99A1AF',
                margin: 0,
                marginBottom: 20,
              }}
            >
              Join the mission
            </p>

            {/* Sign up with Google */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              style={{
                width: '100%',
                height: 45.6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 14,
                border: '0.8px solid #D1D5DC',
                background: '#FFFFFF',
                boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.10), 0px 1px 2px -1px rgba(0,0,0,0.10)',
                cursor: 'pointer',
                marginBottom: 16,
              }}
            >
              <Image src="/icon-google.png" alt="" width={20} height={20} style={{ objectFit: 'contain' }} />
              <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: '20px', color: '#0A0A0A' }}>
                Sign up with Google
              </span>
            </button>

            {/* or create with email divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: '#D1D5DC' }} />
              <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: 12, lineHeight: '16px', color: '#99A1AF', whiteSpace: 'nowrap' }}>
                or create with email
              </span>
              <div style={{ flex: 1, height: 1, background: '#D1D5DC' }} />
            </div>

            {/* First Name + Last Name row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {/* First Name */}
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter', fontWeight: 600, fontSize: 12, lineHeight: '16px', letterSpacing: '0.3px', textTransform: 'uppercase', color: '#1E2939', marginBottom: 6 }}>
                  First Name
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="3" stroke="#99A1AF" strokeWidth="1.2" fill="none"/><path d="M1 13c0-3 2.5-5 6-5s6 2 6 5" stroke="#99A1AF" strokeWidth="1.2" strokeLinecap="round" fill="none"/></svg>
                  </span>
                  <input 
                    type="text" 
                    placeholder="Rahul" 
                    value={signupFirstName}
                    onChange={(e) => setSignupFirstName(e.target.value)}
                    required
                    style={{ width: '100%', height: 45.6, paddingLeft: 36, paddingRight: 16, borderRadius: 14, border: '0.8px solid #D1D5DC', background: '#FFFFFF', fontFamily: 'Inter', fontWeight: 400, fontSize: 14, color: '#0A0A0A', outline: 'none', boxSizing: 'border-box' }} 
                  />
                </div>
              </div>
              {/* Last Name */}
              <div>
                <label style={{ display: 'block', fontFamily: 'Inter', fontWeight: 600, fontSize: 12, lineHeight: '16px', letterSpacing: '0.3px', textTransform: 'uppercase', color: '#1E2939', marginBottom: 6 }}>
                  Last Name
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="3" stroke="#99A1AF" strokeWidth="1.2" fill="none"/><path d="M1 13c0-3 2.5-5 6-5s6 2 6 5" stroke="#99A1AF" strokeWidth="1.2" strokeLinecap="round" fill="none"/></svg>
                  </span>
                  <input 
                    type="text" 
                    placeholder="Sharma" 
                    value={signupLastName}
                    onChange={(e) => setSignupLastName(e.target.value)}
                    style={{ width: '100%', height: 45.6, paddingLeft: 36, paddingRight: 16, borderRadius: 14, border: '0.8px solid #D1D5DC', background: '#FFFFFF', fontFamily: 'Inter', fontWeight: 400, fontSize: 14, color: '#0A0A0A', outline: 'none', boxSizing: 'border-box' }} 
                  />
                </div>
              </div>
            </div>

            {/* Email Address */}
            <div style={{ marginBottom: 12, position: 'relative' }}>
              <label style={{ display: 'block', fontFamily: 'Inter', fontWeight: 600, fontSize: 12, lineHeight: '16px', letterSpacing: '0.3px', textTransform: 'uppercase', color: '#1E2939', marginBottom: 6 }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4l6 5 6-5M2 4h12v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" stroke="#99A1AF" strokeWidth="1.2" strokeLinejoin="round" fill="none"/></svg>
                </span>
                <input 
                  type="email" 
                  placeholder="yourname@gmail.com" 
                  value={signupEmail}
                  onChange={(e) => handleSignupEmailChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 200)}
                  onFocus={() => signupEmail && !signupEmail.includes('@') && setShowEmailSuggestions(true)}
                  required
                  style={{ width: '100%', height: 45.6, paddingLeft: 40, paddingRight: 16, borderRadius: 14, border: '0.8px solid #D1D5DC', background: '#FFFFFF', fontFamily: 'Inter', fontWeight: 400, fontSize: 14, color: '#0A0A0A', outline: 'none', boxSizing: 'border-box' }} 
                />
                {/* Email Suggestions Dropdown */}
                {showEmailSuggestions && emailSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: '#FFFFFF',
                    border: '0.8px solid #D1D5DC',
                    borderRadius: 10,
                    boxShadow: '0px 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 100,
                    overflow: 'hidden',
                  }}>
                    {emailSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => selectEmailSuggestion(suggestion)}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          fontFamily: 'Inter',
                          fontSize: 14,
                          color: '#0A0A0A',
                          borderBottom: index < emailSuggestions.length - 1 ? '1px solid #F0F0F0' : 'none',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = '#F9FAFB';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = '#FFFFFF';
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Number */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontFamily: 'Inter', fontWeight: 600, fontSize: 12, lineHeight: '16px', letterSpacing: '0.3px', textTransform: 'uppercase', color: '#1E2939', marginBottom: 6 }}>
                Mobile Number
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="4" y="1" width="8" height="14" rx="2" stroke="#99A1AF" strokeWidth="1.2" fill="none"/><circle cx="8" cy="12" r="0.8" fill="#99A1AF"/></svg>
                </span>
                <input 
                  type="tel" 
                  placeholder="+91 9876543210" 
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                  style={{ width: '100%', height: 45.6, paddingLeft: 40, paddingRight: 16, borderRadius: 14, border: '0.8px solid #D1D5DC', background: '#FFFFFF', fontFamily: 'Inter', fontWeight: 400, fontSize: 14, color: '#0A0A0A', outline: 'none', boxSizing: 'border-box' }} 
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontFamily: 'Inter', fontWeight: 600, fontSize: 12, lineHeight: '16px', letterSpacing: '0.3px', textTransform: 'uppercase', color: '#1E2939', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
                  <Image src="/icon-lock.png" alt="" width={16} height={16} style={{ objectFit: 'contain' }} />
                </span>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Create a strong password" 
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{ width: '100%', height: 45.6, paddingLeft: 40, paddingRight: 40, borderRadius: 14, border: '0.8px solid #D1D5DC', background: '#FFFFFF', fontFamily: 'Inter', fontWeight: 400, fontSize: 14, color: '#0A0A0A', outline: 'none', boxSizing: 'border-box' }} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="#99A1AF" strokeWidth="1.2" fill="none"/><circle cx="8" cy="8" r="2" stroke="#99A1AF" strokeWidth="1.2" fill="none"/></svg>
                </button>
              </div>
            </div>

            {/* Terms checkbox */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14 }}>
              <input 
                type="checkbox" 
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                style={{ marginTop: 3, accentColor: '#155DFC', flexShrink: 0, width: 14, height: 14 }} 
              />
              <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: 12, lineHeight: '19.5px', color: '#4A5565' }}>
                I agree to the{' '}
                <Link href="#" style={{ fontWeight: 600, color: '#155DFC', textDecoration: 'none' }}>Terms of Service</Link>
                {' '}and{' '}
                <Link href="#" style={{ fontWeight: 600, color: '#155DFC', textDecoration: 'none' }}>Privacy Policy.</Link>
                <br />
                I consent to receive UPSC preparation updates from Rise with Jeet.
              </span>
            </div>

            {/* Create Free Account button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 9999,
                background: isLoading ? '#6B7280' : '#0F1C2E',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter',
                fontWeight: 600,
                fontSize: 14,
                lineHeight: '20px',
                color: '#FFFFFF',
                textAlign: 'center',
                marginBottom: 12,
              }}
            >
              {isLoading ? 'Creating Account...' : 'Create Free Account →'}
            </button>

            {/* Already have account */}
            <div style={{ textAlign: 'center', fontFamily: 'Inter', fontWeight: 400, fontSize: 14, lineHeight: '20px', color: '#0A0A0A' }}>
              Already have an account?{' '}
              <button 
                type="button"
                onClick={() => { setActiveTab('login'); setError(null); }} 
                style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, color: '#155DFC', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Login →
              </button>
            </div>
          </form>
        )}

        {/* ── LOGIN FORM ── */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin}>
            {/* Heading */}
            <div style={{ marginBottom: 8 }}>
              <h1
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 700,
                  fontStyle: 'italic',
                  fontSize: 36,
                  lineHeight: '40px',
                  color: '#0A0A0A',
                  margin: 0,
                  letterSpacing: 0,
                }}
              >
                Welcome{' '}
                <span style={{ color: '#D9A84F', fontStyle: 'italic', fontWeight: 700 }}>back</span>{' '}
              </h1>
            </div>
            <p
              style={{
                fontFamily: 'Inter',
                fontWeight: 400,
                fontSize: 14,
                lineHeight: '20px',
                color: '#6A7282',
                marginBottom: 24,
                marginTop: 0,
              }}
            >
              Sign in to continue your UPSC preparation
            </p>

            {/* Continue with Google */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              style={{
                width: '100%',
                height: 45.6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 10,
                border: '0.8px solid #D1D5DC',
                background: '#FFFFFF',
                cursor: 'pointer',
                marginBottom: 20,
              }}
            >
              {/* Google icon */}
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.78h5.4a4.6 4.6 0 01-2 3.02v2.5h3.24C18.36 15.9 19.6 13.3 19.6 10.23z" fill="#4285F4" />
                <path d="M10 20c2.7 0 4.97-.9 6.62-2.44l-3.24-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H1.07v2.58A9.99 9.99 0 0010 20z" fill="#34A853" />
                <path d="M4.41 11.9A6.01 6.01 0 014.1 10c0-.66.12-1.3.31-1.9V5.52H1.07A9.99 9.99 0 000 10c0 1.61.38 3.14 1.07 4.48l3.34-2.58z" fill="#FBBC05" />
                <path d="M10 3.98c1.47 0 2.78.5 3.82 1.5l2.87-2.87C14.96.9 12.7 0 10 0A9.99 9.99 0 001.07 5.52l3.34 2.58C5.2 5.74 7.4 3.98 10 3.98z" fill="#EA4335" />
              </svg>
              <span
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: 14,
                  lineHeight: '20px',
                  color: '#0A0A0A',
                }}
              >
                Continue with Google
              </span>
            </button>

            {/* OR WITH EMAIL divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div style={{ flex: 1, height: 1, background: '#D1D5DC' }} />
              <span
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 400,
                  fontSize: 12,
                  lineHeight: '16px',
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  color: '#99A1AF',
                  whiteSpace: 'nowrap',
                }}
              >
                Or with email
              </span>
              <div style={{ flex: 1, height: 1, background: '#D1D5DC' }} />
            </div>

            {/* Email field */}
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: 12,
                  lineHeight: '16px',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                  color: '#364153',
                  marginBottom: 6,
                }}
              >
                Email Address
              </label>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 14,
                    color: '#99A1AF',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4l6 5 6-5M2 4h12v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" stroke="#99A1AF" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder="yourname@gmail.com"
                  value={loginEmail}
                  onChange={(e) => handleLoginEmailChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowLoginEmailSuggestions(false), 200)}
                  onFocus={() => loginEmail && !loginEmail.includes('@') && setShowLoginEmailSuggestions(true)}
                  required
                  style={{
                    width: '100%',
                    height: 45.6,
                    paddingTop: 12,
                    paddingBottom: 12,
                    paddingLeft: 40,
                    paddingRight: 16,
                    borderRadius: 10,
                    border: '0.8px solid #D1D5DC',
                    background: '#FFFFFF',
                    fontFamily: 'Inter',
                    fontWeight: 400,
                    fontSize: 14,
                    color: '#0A0A0A',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {/* Email Suggestions Dropdown */}
                {showLoginEmailSuggestions && loginEmailSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: '#FFFFFF',
                    border: '0.8px solid #D1D5DC',
                    borderRadius: 10,
                    boxShadow: '0px 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 100,
                    overflow: 'hidden',
                  }}>
                    {loginEmailSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => selectLoginEmailSuggestion(suggestion)}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          fontFamily: 'Inter',
                          fontSize: 14,
                          color: '#0A0A0A',
                          borderBottom: index < loginEmailSuggestions.length - 1 ? '1px solid #F0F0F0' : 'none',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = '#F9FAFB';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = '#FFFFFF';
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Password field */}
            <div style={{ marginBottom: 8 }}>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: 12,
                  lineHeight: '16px',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                  color: '#364153',
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 14,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Image src="/icon-lock.png" alt="" width={16} height={16} style={{ objectFit: 'contain' }} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: 45.6,
                    paddingTop: 12,
                    paddingBottom: 12,
                    paddingLeft: 40,
                    paddingRight: 40,
                    borderRadius: 10,
                    border: '0.8px solid #D1D5DC',
                    background: '#FFFFFF',
                    fontFamily: 'Inter',
                    fontWeight: 400,
                    fontSize: 14,
                    color: '#0A0A0A',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 14,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#99A1AF',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                  }}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="#99A1AF" strokeWidth="1.2" fill="none" />
                      <circle cx="8" cy="8" r="2" stroke="#99A1AF" strokeWidth="1.2" fill="none" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2l12 12M6.5 6.6a2 2 0 002.8 2.8M4.2 4.3C2.8 5.3 2 7 2 8s2.5 5 6 5c1.3 0 2.5-.4 3.5-1M6 3.2C6.6 3 7.3 3 8 3c3.5 0 6 3 6 5 0 .9-.4 1.8-1 2.6" stroke="#99A1AF" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <Link
                href="#"
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: 12,
                  lineHeight: '16px',
                  color: '#155DFC',
                  textDecoration: 'none',
                }}
              >
                Forgot password?
              </Link>
            </div>

            {/* Log In button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 10,
                background: isLoading ? '#6B7280' : '#0F1C2E',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontFamily: 'Inter',
                fontWeight: 600,
                fontSize: 14,
                lineHeight: '20px',
                color: '#FFFFFF',
                marginBottom: 14,
              }}
            >
              {isLoading ? 'Logging in...' : 'Log In to My Account'}
              {!isLoading && <Image src="/icon-login-arrow.png" alt="" width={18} height={18} style={{ objectFit: 'contain' }} />}
            </button>

            {/* New Here — CTA button */}
            <button
              type="button"
              onClick={() => { setActiveTab('signup'); setError(null); }}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 14,
                background: '#D9A84F',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 700,
                  fontSize: 14,
                  lineHeight: '28px',
                  letterSpacing: 0,
                  textAlign: 'center',
                  color: '#101828',
                }}
              >
                New Here Create A Free Account →
              </span>
            </button>

            {/* Login with OTP button — no background */}
            <button
              type="button"
              style={{
                width: '100%',
                height: 44,
                borderRadius: 14,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontFamily: 'Inter',
                fontWeight: 600,
                fontSize: 14,
                lineHeight: '20px',
                color: '#4C6FFF',
              }}
            >
              <Image src="/icon-otp.png" alt="" width={18} height={18} style={{ objectFit: 'contain' }} />
              Login with OTP Instead
              <Image src="/icon-login-arrow.png" alt="" width={18} height={18} style={{ objectFit: 'contain', filter: 'brightness(0) saturate(100%) invert(27%) sepia(97%) saturate(2500%) hue-rotate(217deg) brightness(102%)' }} />
            </button>
          </form>
        )}
        </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function LoginPageFallback() {
  return (
    <div className="flex w-full min-h-screen items-center justify-center" style={{ background: '#F9FAFB' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Export with Suspense wrapper
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
