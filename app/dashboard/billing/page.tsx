'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const cardStyle = {
  boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px 0px rgba(0,0,0,0.1)',
};

const billingHistory = [
  { date: 'Mar 15, 2026', plan: 'Annual Pro', amount: '₹11,988' },
  { date: 'Mar 16, 2025', plan: 'Annual Pro', amount: '₹11,988' },
  { date: 'Mar 18, 2024', plan: 'Monthly Pro', amount: '₹999' },
];

export default function BillingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f1f5f9] px-4 sm:px-6 py-6 md:py-8" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="font-normal text-[14px] leading-[20px] text-[#155dfc] hover:text-[#1248c9]">
          Home
        </Link>
        <span className="text-[14px] leading-[20px] text-[#90a1b9]">›</span>
        <span className="font-normal text-[14px] leading-[20px] text-[#62748e]">Billing</span>
      </nav>

      {/* Page Title */}
      <h1 className="text-xl md:text-2xl lg:text-[30px] leading-[36px] font-bold text-[#0f172b] mb-5 md:mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        Billing & Subscription
      </h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column - Current Plan + Payment Method */}
        <div className="w-full lg:w-[340px] flex flex-col gap-6 flex-shrink-0">
          {/* Current Plan Card */}
          <div
            className="bg-white rounded-[14px] border-[0.8px] border-[#e2e8f0] pt-[24.8px] px-[24.8px] pb-[24.8px] flex flex-col gap-4"
            style={cardStyle}
          >
            <h3 className="font-semibold text-[18px] leading-[28px] text-[#0f172b]">Current Plan</h3>

            <div className="rounded-[10px] border-[0.8px] border-[#e2e8f0] bg-[#f8fafc] px-[16.8px] pt-[16.8px] pb-[16.8px] flex flex-col gap-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[16px] leading-[24px] text-[#0f172b]">Pro Aspirant</span>
                <span className="inline-flex items-center px-3 py-1 rounded-full font-semibold text-[12px] leading-[16px] text-[#008236] bg-[#dcfce7]">
                  Active
                </span>
              </div>
              <p className="font-normal text-[14px] leading-[20px] text-[#62748e]">
                ₹999/month · Renews April 15, 2026
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button className="h-[40px] px-5 rounded-[10px] bg-[#1d293d] font-medium text-[14px] leading-[20px] text-white hover:bg-[#2a3a52] transition-colors">
                Upgrade
              </button>
              <button className="h-[40px] rounded-[10px] font-medium text-[14px] leading-[20px] text-[#e7000b] hover:text-[#c00] transition-colors">
                Cancel Plan
              </button>
            </div>
          </div>

          {/* Payment Method Card */}
          <div
            className="bg-white rounded-[14px] border-[0.8px] border-[#e2e8f0] pt-[24.8px] px-[24.8px] pb-[24.8px] flex flex-col gap-4"
            style={cardStyle}
          >
            <h3 className="font-semibold text-[18px] leading-[28px] text-[#0f172b]">Payment Method</h3>

            <div className="flex items-center gap-3 rounded-[10px] border-[0.8px] border-[#e2e8f0] bg-[#f8fafc] px-4 py-4">
              {/* Card emoji */}
              <span className="text-[40px] leading-none flex-shrink-0">💳</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14px] leading-[20px] text-[#0f172b]">Visa ending in 4242</p>
                <p className="font-normal text-[12px] leading-[16px] text-[#62748e]">Expires 06/2027</p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full font-semibold text-[12px] leading-[16px] text-[#008236] bg-[#dcfce7]">
                Default
              </span>
            </div>

            <button className="font-medium text-[14px] leading-[20px] text-[#155dfc] hover:text-[#1248c9] transition-colors text-left">
              + Add payment method
            </button>
          </div>
        </div>

        {/* Right Column - Billing History */}
        <div className="flex-1 min-w-0">
          <div
            className="bg-white rounded-[14px] border-[0.8px] border-[#e2e8f0] pt-[24.8px] px-[24.8px] pb-[24.8px] flex flex-col gap-4"
            style={cardStyle}
          >
            <h3 className="font-semibold text-[18px] leading-[28px] text-[#0f172b]">Billing History</h3>

            <div className="flex flex-col gap-3">
              {billingHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between py-4 ${idx !== billingHistory.length - 1 ? 'border-b-[0.8px] border-[#f1f5f9]' : ''}`}
                >
                  <span className="font-medium text-[14px] leading-[20px] text-[#0f172b]">
                    {item.date} — {item.plan}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[14px] leading-[20px] text-[#0f172b]">{item.amount}</span>
                    <button className="h-[33.6px] px-4 rounded-[10px] border-[0.8px] border-[#cad5e2] font-medium text-[14px] leading-[20px] text-[#314158] hover:bg-[#f8fafc] transition-colors">
                      Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
