'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/lib/services';

const cardStyle = {
  boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.1), 0px 1px 2px 0px rgba(0,0,0,0.1)',
};

interface OrderItem {
  id: string;
  itemName: string;
  amount: number;
  status: string;
  created_at: string;
}

interface Subscription {
  plan: 'free' | 'trial' | 'pro' | 'pro-annual';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  renewsOn?: string;
  trialEndsOn?: string;
  amount?: string;
}

export default function BillingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const trialJustStarted = searchParams.get('trial') === 'started';

  const [sub, setSub] = useState<Subscription | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subRes, ordersRes] = await Promise.all([
          userService.getSubscription(),
          userService.getOrders(),
        ]);
        setSub(subRes.data || { plan: 'free', status: 'expired' });
        setOrders(ordersRes.data || []);
      } catch {
        // Fallback to localStorage if backend fails
        const localPlan = typeof window !== 'undefined'
          ? (localStorage.getItem('userPlan') as Subscription['plan'] | null)
          : null;
        const trialEnd = typeof window !== 'undefined' ? localStorage.getItem('proTrialEnd') : null;
        if (localPlan === 'trial' && trialEnd) {
          setSub({ plan: 'trial', status: 'trial', trialEndsOn: trialEnd, amount: 'Free 7-day trial' });
        } else {
          setSub({ plan: 'free', status: 'expired' });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleUpgrade = () => {
    setActionMsg(null);
    router.push('/pricing');
  };

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? You will keep Pro access until the end of the current period.')) return;
    try {
      await userService.cancelSubscription();
      setSub({ plan: 'free', status: 'expired' });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userPlan');
        localStorage.removeItem('proTrialEnd');
      }
      setActionMsg('Subscription cancelled. You will revert to the free plan at the end of the current period.');
    } catch (err: any) {
      setActionMsg(err?.message || 'Could not cancel subscription. Please try again.');
    }
  };

  const handleAddPaymentMethod = () => {
    setActionMsg('Payment method capture is coming soon. We will email you when it is live.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] px-6 py-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  const isPaid = sub && (sub.plan === 'pro' || sub.plan === 'pro-annual' || sub.plan === 'trial');

  return (
    <div className="min-h-screen bg-[#f1f5f9] px-6 py-8" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="font-normal text-[14px] leading-[20px] text-[#155dfc] hover:text-[#1248c9]">
          Home
        </Link>
        <span className="text-[14px] leading-[20px] text-[#90a1b9]">›</span>
        <span className="font-normal text-[14px] leading-[20px] text-[#62748e]">Billing</span>
      </nav>

      <h1 className="text-[30px] leading-[36px] font-bold text-[#0f172b] mb-6">
        Billing & Subscription
      </h1>

      {trialJustStarted && (
        <div className="mb-6 rounded-[10px] border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-[#15803D] text-[14px]">
          🎉 Your 7-day free trial is active. Enjoy full Pro access until {new Date(sub?.trialEndsOn || Date.now()).toLocaleDateString()}.
        </div>
      )}

      {actionMsg && (
        <div className="mb-6 rounded-[10px] border border-[#FED7AA] bg-[#FFF7ED] px-4 py-3 text-[#9A3412] text-[14px]">
          {actionMsg}
        </div>
      )}

      {/* Free user — show upsell, NOT a fake purchased state */}
      {!isPaid && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-[340px] flex flex-col gap-6 flex-shrink-0">
            <div
              className="bg-white rounded-[14px] border-[0.8px] border-[#e2e8f0] pt-[24.8px] px-[24.8px] pb-[24.8px] flex flex-col gap-4"
              style={cardStyle}
            >
              <h3 className="font-semibold text-[18px] leading-[28px] text-[#0f172b]">Current Plan</h3>
              <div className="rounded-[10px] border-[0.8px] border-[#e2e8f0] bg-[#f8fafc] px-[16.8px] pt-[16.8px] pb-[16.8px] flex flex-col gap-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[16px] leading-[24px] text-[#0f172b]">Free</span>
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full font-semibold text-[12px] leading-[16px]"
                    style={{ color: '#9A3412', background: '#FED7AA' }}
                  >
                    Not subscribed
                  </span>
                </div>
                <p className="font-normal text-[14px] leading-[20px] text-[#62748e] mt-1">
                  You are currently on the free plan.
                </p>
              </div>
              <button
                onClick={handleUpgrade}
                className="h-[40px] px-5 rounded-[10px] bg-[#1d293d] font-medium text-[14px] text-white hover:bg-[#2a3a52] transition-colors"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div
              className="bg-white rounded-[14px] border-[0.8px] border-[#e2e8f0] pt-[24.8px] px-[24.8px] pb-[24.8px] flex flex-col gap-4"
              style={cardStyle}
            >
              <h3 className="font-semibold text-[18px] leading-[28px] text-[#0f172b]">Plan Benefits</h3>
              <p className="text-[14px] text-[#62748e]">
                Upgrade to Pro to unlock unlimited mock tests, full PYQ archive, AI-powered mains evaluation, mindmap builder, and spaced-repetition reminders.
              </p>
              <p className="text-[12px] text-[#90a1b9]">
                No payment history while on the free plan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Paid / trial user — real subscription state */}
      {isPaid && sub && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-[340px] flex flex-col gap-6 flex-shrink-0">
            <div
              className="bg-white rounded-[14px] border-[0.8px] border-[#e2e8f0] pt-[24.8px] px-[24.8px] pb-[24.8px] flex flex-col gap-4"
              style={cardStyle}
            >
              <h3 className="font-semibold text-[18px] leading-[28px] text-[#0f172b]">Current Plan</h3>

              <div className="rounded-[10px] border-[0.8px] border-[#e2e8f0] bg-[#f8fafc] px-[16.8px] pt-[16.8px] pb-[16.8px] flex flex-col gap-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[16px] leading-[24px] text-[#0f172b]">
                    {sub.plan === 'trial' ? 'Pro · 7-day Trial' : sub.plan === 'pro-annual' ? 'Pro Annual' : 'Pro'}
                  </span>
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full font-semibold text-[12px] leading-[16px]"
                    style={{
                      color: sub.status === 'active' || sub.status === 'trial' ? '#008236' : '#9A3412',
                      background: sub.status === 'active' || sub.status === 'trial' ? '#dcfce7' : '#FED7AA',
                    }}
                  >
                    {sub.status === 'trial' ? 'Trial' : sub.status === 'active' ? 'Active' : 'Cancelled'}
                  </span>
                </div>
                <p className="font-normal text-[14px] leading-[20px] text-[#62748e] mt-1">
                  {sub.amount || '₹999/month'}
                  {sub.renewsOn && ` · Renews ${new Date(sub.renewsOn).toLocaleDateString()}`}
                  {sub.trialEndsOn && ` · Trial ends ${new Date(sub.trialEndsOn).toLocaleDateString()}`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleUpgrade}
                  className="h-[40px] px-5 rounded-[10px] bg-[#1d293d] font-medium text-[14px] text-white hover:bg-[#2a3a52] transition-colors"
                >
                  Upgrade
                </button>
                <button
                  onClick={handleCancel}
                  className="h-[40px] rounded-[10px] font-medium text-[14px] text-[#e7000b] hover:text-[#c00] transition-colors"
                >
                  Cancel Plan
                </button>
              </div>
            </div>

            <div
              className="bg-white rounded-[14px] border-[0.8px] border-[#e2e8f0] pt-[24.8px] px-[24.8px] pb-[24.8px] flex flex-col gap-4"
              style={cardStyle}
            >
              <h3 className="font-semibold text-[18px] leading-[28px] text-[#0f172b]">Payment Method</h3>
              <p className="text-[14px] text-[#62748e]">No payment method on file.</p>
              <button
                onClick={handleAddPaymentMethod}
                className="font-medium text-[14px] leading-[20px] text-[#155dfc] hover:text-[#1248c9] transition-colors text-left"
              >
                + Add payment method
              </button>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div
              className="bg-white rounded-[14px] border-[0.8px] border-[#e2e8f0] pt-[24.8px] px-[24.8px] pb-[24.8px] flex flex-col gap-4"
              style={cardStyle}
            >
              <h3 className="font-semibold text-[18px] leading-[28px] text-[#0f172b]">Billing History</h3>

              {orders.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {orders.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between py-4 ${idx !== orders.length - 1 ? 'border-b-[0.8px] border-[#f1f5f9]' : ''}`}
                    >
                      <span className="font-medium text-[14px] leading-[20px] text-[#0f172b]">
                        {new Date(item.created_at).toLocaleDateString()} — {item.itemName}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-[14px] leading-[20px] text-[#0f172b]">₹{(item.amount / 100).toLocaleString()}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium capitalize" style={{
                          color: item.status === 'paid' ? '#008236' : '#9A3412',
                          background: item.status === 'paid' ? '#dcfce7' : '#FED7AA',
                        }}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[14px] text-[#62748e]">No invoices yet — your first receipt will appear here after the trial converts.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
