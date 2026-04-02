'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(trialEnd: string): TimeLeft | null {
  const diff = new Date(trialEnd).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const TrialCountdownBanner: React.FC = () => {
  const { user } = useAuth();
  const [trialEnd, setTrialEnd] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const fetchTrial = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('trial_end, status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) return;
      if (data?.trial_end && data?.status === 'trialing') {
        setTrialEnd(data.trial_end);
        setStatus(data.status);
      }
    } catch {
      // Silently ignore errors (e.g. stale session)
    }
  }, [user]);

  useEffect(() => {
    fetchTrial();
  }, [fetchTrial]);

  useEffect(() => {
    if (!trialEnd) return;
    setTimeLeft(calcTimeLeft(trialEnd));
    const interval = setInterval(() => {
      const tl = calcTimeLeft(trialEnd);
      setTimeLeft(tl);
      if (!tl) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [trialEnd]);

  // Don't show if: no user, not trialing, dismissed, or trial expired
  if (!user || status !== 'trialing' || !trialEnd || !timeLeft || dismissed) {
    return null;
  }

  const isUrgent = timeLeft.days < 2;

  return (
    <div
      className={`w-full z-40 flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 text-sm font-medium transition-all ${
        isUrgent
          ? 'bg-red-600 text-white' :'bg-gold-600 text-navy-950'
      }`}
      style={{ minHeight: '40px' }}
    >
      {/* Icon */}
      <svg
        className={`w-4 h-4 flex-shrink-0 ${isUrgent ? 'text-white' : 'text-navy-950'}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>

      {/* Countdown text */}
      <span className="text-xs sm:text-sm whitespace-nowrap">
        {isUrgent ? '⚠️ Trial ending! ' : <span className="hidden sm:inline">Subscription ends in </span>}
        <span className="font-bold font-mono">
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {String(timeLeft.hours).padStart(2, '0')}h{' '}
          {String(timeLeft.minutes).padStart(2, '0')}m{' '}
          <span className="hidden sm:inline">{String(timeLeft.seconds).padStart(2, '0')}s</span>
        </span>
      </span>

      {/* CTA */}
      <Link
        href="/subscription"
        className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-0.5 rounded-full text-xs font-bold border transition-colors ${
          isUrgent
            ? 'border-white text-white hover:bg-white hover:text-red-600' :'border-navy-950 text-navy-950 hover:bg-navy-950 hover:text-gold-400'
        }`}
      >
        Upgrade
      </Link>

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss subscription banner"
        className={`ml-1 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full opacity-70 hover:opacity-100 transition-opacity ${
          isUrgent ? 'text-white' : 'text-navy-950'
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default TrialCountdownBanner;
