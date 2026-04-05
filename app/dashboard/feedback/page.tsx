'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/lib/services';

const cardStyle = {
  boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px 0px rgba(0,0,0,0.1)',
};

const STAR_LABELS = ['Terrible', 'Poor', 'Okay', 'Good', 'Amazing'];
const CATEGORIES = ['General Feedback', 'Bug Report', 'Feature Request', 'Content Issue', 'Performance Issue'];

export default function FeedbackPage() {
  const { user } = useAuth();
  const [rating, setRating] = useState(4);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [category, setCategory] = useState('');
  const [workingWell, setWorkingWell] = useState('');
  const [couldBeBetter, setCouldBeBetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!workingWell.trim()) return;
    setSubmitting(true);
    try {
      await userService.submitFeedback({ rating, category, workingWell, couldBeBetter });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setRating(4);
        setCategory('');
        setWorkingWell('');
        setCouldBeBetter('');
      }, 3000);
    } catch {
      // silently handle
    }
    setSubmitting(false);
  };

  const activeStars = hoveredStar || rating;

  return (
    <div className="min-h-screen bg-[#f1f5f9] px-6 py-8" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="font-normal text-[14px] leading-[20px] text-[#155dfc] hover:text-[#1248c9]">
          Home
        </Link>
        <span className="text-[14px] leading-[20px] text-[#90a1b9]">›</span>
        <span className="font-normal text-[14px] leading-[20px] text-[#62748e]">Feedback</span>
      </nav>

      {/* Page Title */}
      <h1 className="text-[30px] leading-[36px] font-bold text-[#0f172b] mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
        Feedback & Bug Reports
      </h1>
      <p className="font-normal text-[14px] leading-[20px] text-[#62748e] mb-8">
        Every response is read by the team. You shape this platform.
      </p>

      {/* Share Feedback Card - Full Width */}
      <div
        className="bg-white rounded-[14px] border-[0.8px] border-[#e2e8f0] p-8 flex flex-col"
        style={cardStyle}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f172b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <h2 className="font-semibold text-[18px] leading-[28px] text-[#0f172b]">Share Feedback</h2>
        </div>

        {/* Star Rating Section */}
        <div className="flex flex-col items-center gap-3 mb-8">
          {/* Overall experience label */}
          <p className="font-medium text-[14px] leading-[20px] text-[#62748e] text-center">
            Overall experience
          </p>

          {/* Stars */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill={star <= activeStars ? '#f0b100' : 'none'}
                  stroke={star <= activeStars ? '#f0b100' : '#cad5e2'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            ))}
          </div>

          {/* Rating label */}
          <p className="font-semibold text-[16px] leading-[24px] text-[#d08700] text-center">
            {activeStars} / 5 — {STAR_LABELS[activeStars - 1]}
          </p>
        </div>

        {/* Category */}
        <div className="flex flex-col gap-3 mb-6">
          <label className="font-semibold text-[14px] leading-[20px] text-[#45556c]">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-[48.8px] px-4 py-[12px] rounded-[10px] border-[0.8px] border-[#cad5e2] bg-white font-normal text-[16px] leading-[24px] text-[#0f172b] focus:outline-none focus:ring-2 focus:ring-[#1d293d] focus:border-transparent appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2390a1b9' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 16px center',
            }}
          >
            <option value="" disabled>Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* What's working well? */}
        <div className="flex flex-col gap-3 mb-6">
          <label className="font-semibold text-[14px] leading-[20px] text-[#101828]">
            What&apos;s working well?
          </label>
          <textarea
            value={workingWell}
            onChange={(e) => setWorkingWell(e.target.value)}
            placeholder="Tell us what you love..."
            className="w-full h-[121.6px] px-4 py-3 rounded-[10px] border-[0.8px] border-[#cad5e2] bg-white font-normal text-[16px] leading-[24px] text-[#0f172b] placeholder:text-[#90a1b9] focus:outline-none focus:ring-2 focus:ring-[#1d293d] focus:border-transparent resize-none"
          />
        </div>

        {/* What could be better? */}
        <div className="flex flex-col gap-3 mb-8">
          <label className="font-semibold text-[14px] leading-[20px] text-[#101828]">
            What could be better?
          </label>
          <textarea
            value={couldBeBetter}
            onChange={(e) => setCouldBeBetter(e.target.value)}
            placeholder="Be specific — it really helps..."
            className="w-full h-[121.6px] px-4 py-3 rounded-[10px] border-[0.8px] border-[#cad5e2] bg-white font-normal text-[16px] leading-[24px] text-[#0f172b] placeholder:text-[#90a1b9] focus:outline-none focus:ring-2 focus:ring-[#1d293d] focus:border-transparent resize-none"
          />
        </div>

        {/* Submit Button - Full Width */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-[52px] rounded-[10px] bg-[#0f172b] font-semibold text-[16px] leading-[24px] text-white hover:bg-[#1e293b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? 'Submitting...' : (
            <>
              Submit Feedback
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </>
          )}
        </button>

        {submitted && (
          <p className="text-center font-medium text-[14px] leading-[20px] text-[#00a63e] mt-4">
            Thank you! Your feedback has been submitted.
          </p>
        )}
      </div>
    </div>
  );
}
