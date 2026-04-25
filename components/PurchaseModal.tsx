'use client';

import React, { useState } from 'react';
import { pricingService } from '@/lib/services';

interface PurchaseModalProps {
  open: boolean;
  onClose: () => void;
  itemType: 'plan' | 'test_series';
  itemId: string;
  itemName: string;
  amount: number; // in INR
  onSuccess?: () => void;
}

export default function PurchaseModal({ open, onClose, itemType, itemId, itemName, amount, onSuccess }: PurchaseModalProps) {
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');
  const [method, setMethod] = useState<'upi' | 'card'>('upi');
  const [error, setError] = useState('');

  if (!open) return null;

  const handlePurchase = async () => {
    setError('');
    setStep('processing');
    try {
      // Create order in backend
      await pricingService.createOrder({
        itemType,
        itemId,
        itemName,
        amount: amount * 100, // convert to paise
      });

      // In a real app, this would redirect to Razorpay/Stripe checkout
      // For now we simulate a successful order creation
      setTimeout(() => {
        setStep('success');
        onSuccess?.();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
      setStep('form');
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '460px',
          padding: '28px',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            width: '32px', height: '32px', borderRadius: '50%',
            background: '#F3F4F6', border: 'none', color: '#6B7280',
            fontSize: '18px', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >×</button>

        {step === 'form' && (
          <>
            <h3 className="font-arimo font-bold text-[#101828] text-xl mb-1">Complete Your Purchase</h3>
            <p className="font-arimo text-[#6A7282] text-sm mb-6">{itemName}</p>

            <div className="bg-[#F9FAFB] rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-arimo text-sm text-[#374151]">Amount</span>
                <span className="font-arimo font-bold text-lg text-[#101828]">₹{amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-arimo text-sm text-[#374151]">GST</span>
                <span className="font-arimo text-sm text-[#374151]">Included</span>
              </div>
            </div>

            <div className="mb-4">
              <p className="font-arimo font-medium text-sm text-[#374151] mb-2">Payment Method</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setMethod('upi')}
                  className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                    method === 'upi' ? 'border-[#101828] bg-[#101828] text-white' : 'border-gray-200 text-[#374151] hover:border-gray-300'
                  }`}
                >
                  UPI / QR
                </button>
                <button
                  onClick={() => setMethod('card')}
                  className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                    method === 'card' ? 'border-[#101828] bg-[#101828] text-white' : 'border-gray-200 text-[#374151] hover:border-gray-300'
                  }`}
                >
                  Card / Netbanking
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm font-arimo">
                {error}
              </div>
            )}

            <button
              onClick={handlePurchase}
              className="w-full py-3.5 rounded-xl bg-[#101828] text-white font-arimo font-bold text-base hover:bg-[#1E2875] transition-colors"
            >
              Pay ₹{amount.toLocaleString('en-IN')}
            </button>

            <p className="text-center text-xs text-[#9CA3AF] mt-3">
              Secure payment powered by Razorpay
            </p>
          </>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
            <p className="font-arimo font-medium text-[#101828]">Processing payment...</p>
            <p className="font-arimo text-sm text-[#6A7282] mt-1">Please do not close this window</p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl mb-4">🎉</div>
            <h3 className="font-arimo font-bold text-[#101828] text-xl mb-2">Payment Successful!</h3>
            <p className="font-arimo text-sm text-[#6A7282] mb-6">
              Your order has been placed. You will receive a confirmation email shortly.
            </p>
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-xl bg-[#101828] text-white font-arimo font-bold text-sm hover:bg-[#1E2875] transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
