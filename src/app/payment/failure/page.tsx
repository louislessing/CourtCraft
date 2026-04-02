'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import BackButton from '@/components/ui/BackButton';

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  card_declined: {
    title: 'Card Declined',
    description: 'Your card was declined by your bank. Please try a different card or contact your bank.',
  },
  insufficient_funds: {
    title: 'Insufficient Funds',
    description: 'Your card has insufficient funds. Please use a different payment method.',
  },
  expired_card: {
    title: 'Card Expired',
    description: 'Your card has expired. Please update your card details and try again.',
  },
  incorrect_cvc: {
    title: 'Incorrect CVC',
    description: 'The security code you entered is incorrect. Please check and try again.',
  },
  processing_error: {
    title: 'Processing Error',
    description: 'A temporary error occurred while processing your payment. Please try again.',
  },
  default: {
    title: 'Payment Unsuccessful',
    description: 'We were unable to process your payment. Please check your details and try again.',
  },
};

function PaymentFailureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);

  const errorCode = searchParams.get('error_code') || 'default';
  const errorMessage = searchParams.get('error_message');

  const errorInfo = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES['default'];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const commonReasons = [
    { icon: 'CreditCardIcon', text: 'Incorrect card number, expiry, or CVC' },
    { icon: 'BanknotesIcon', text: 'Insufficient funds or spending limit reached' },
    { icon: 'ShieldExclamationIcon', text: 'Card blocked for online transactions' },
    { icon: 'ClockIcon', text: 'Temporary issue with your bank — try again shortly' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      {/* Header */}
      <header className="px-4 sm:px-6 py-4 border-b border-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/homepage" className="flex items-center gap-2 group">
            <AppLogo size={28} iconName="ScaleIcon" className="text-gold-500" />
            <div className="flex flex-col">
              <span className="font-display font-900 text-sm sm:text-base tracking-tight text-white leading-none">
                Court<span className="text-gold-500">Craft</span>
              </span>
              <span className="text-gold-500 opacity-70 leading-none" style={{ fontSize: '7px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Advocate
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <BackButton className="text-white/50 hover:text-gold-400" label="Back" />
            <Link href="/homepage" className="text-xs text-white text-opacity-50 hover:text-gold-400 transition-colors flex items-center gap-1">
              <Icon name="HomeIcon" size={12} />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10 sm:py-16">
        <div className="w-full max-w-2xl">

          {/* Error Icon */}
          <div
            className="text-center mb-8"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            <div className="relative mx-auto mb-5 w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-red-500 bg-opacity-15" />
              <div className="absolute inset-0 rounded-full bg-red-500 bg-opacity-10 animate-ping" style={{ animationDuration: '3s' }} />
              <div className="relative w-24 h-24 rounded-full flex items-center justify-center">
                <Icon name="XCircleIcon" size={48} className="text-red-400" />
              </div>
            </div>
            <h1 className="font-display font-900 text-3xl sm:text-4xl text-white mb-2">
              {errorInfo.title}
            </h1>
            <p className="text-white text-opacity-60 text-sm sm:text-base max-w-md mx-auto">
              {errorMessage || errorInfo.description}
            </p>
          </div>

          {/* Error Detail Card */}
          <div
            className="bg-navy-900 border border-red-500 border-opacity-20 rounded-2xl p-5 sm:p-6 mb-6"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s ease 0.15s',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-red-500 bg-opacity-15 flex items-center justify-center flex-shrink-0">
                <Icon name="ExclamationTriangleIcon" size={16} className="text-red-400" />
              </div>
              <h2 className="font-display font-700 text-base text-white">Common Reasons for Failure</h2>
            </div>
            <div className="space-y-2.5">
              {commonReasons.map((reason, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-white bg-opacity-5 flex items-center justify-center flex-shrink-0">
                    <Icon name={reason.icon as any} size={12} className="text-white text-opacity-40" />
                  </div>
                  <p className="text-xs text-white text-opacity-55">{reason.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div
            className="space-y-3 mb-6"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s ease 0.3s',
            }}
          >
            {/* Primary: Retry */}
            <Link
              href="/subscription"
              className="btn-gold justify-center py-4 w-full flex items-center gap-2 rounded-2xl font-700 text-sm"
            >
              <Icon name="ArrowPathIcon" size={18} className="text-navy-900" />
              Try Payment Again
            </Link>

            {/* Secondary: Dashboard (if logged in) */}
            {user && (
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border border-white border-opacity-15 text-sm text-white text-opacity-70 hover:text-white hover:border-opacity-30 transition-colors font-600"
              >
                <Icon name="HomeIcon" size={16} className="text-white text-opacity-50" />
                Go to Dashboard
              </Link>
            )}
          </div>

          {/* Support Contact */}
          <div
            className="bg-navy-900 border border-white border-opacity-10 rounded-2xl p-5 sm:p-6"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s ease 0.45s',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gold-500 bg-opacity-15 flex items-center justify-center flex-shrink-0">
                <Icon name="LifebuoyIcon" size={16} className="text-gold-400" />
              </div>
              <h2 className="font-display font-700 text-base text-white">Need Help?</h2>
            </div>
            <p className="text-xs text-white text-opacity-50 mb-4 leading-relaxed">
              If the problem persists, our support team is here to help. We typically respond within a few hours.
            </p>
            <div className="space-y-2.5">
              <a
                href="mailto:support@courtcraftadvocate.com"
                className="flex items-center gap-3 p-3 rounded-xl bg-white bg-opacity-5 hover:bg-opacity-10 transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-gold-500 bg-opacity-15 flex items-center justify-center flex-shrink-0">
                  <Icon name="EnvelopeIcon" size={13} className="text-gold-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-600">Email Support</p>
                  <p className="text-xs text-gold-400 group-hover:underline truncate">support@courtcraftadvocate.com</p>
                </div>
                <Icon name="ArrowRightIcon" size={12} className="text-white text-opacity-30 flex-shrink-0" />
              </a>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white bg-opacity-5">
                <div className="w-7 h-7 rounded-lg bg-white bg-opacity-5 flex items-center justify-center flex-shrink-0">
                  <Icon name="ClockIcon" size={13} className="text-white text-opacity-40" />
                </div>
                <div>
                  <p className="text-xs text-white font-600">Response Time</p>
                  <p className="text-xs text-white text-opacity-40">Usually within 2–4 hours (Mon–Fri)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reassurance */}
          <p
            className="text-center text-xs text-white text-opacity-25 mt-5"
            style={{
              opacity: visible ? 1 : 0,
              transition: 'all 0.5s ease 0.6s',
            }}
          >
            <Icon name="ShieldCheckIcon" size={11} className="inline mr-1 text-white text-opacity-25" />
            No charge was made to your card. Your payment details are secure and encrypted.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PaymentFailureContent />
    </Suspense>
  );
}
