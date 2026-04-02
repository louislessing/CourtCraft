'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import BackButton from '@/components/ui/BackButton';

interface SubscriptionDetails {
  plan: string;
  amount: string;
  currency: string;
  status: string;
  nextBillingDate: string;
  email: string;
  orderId: string;
  invoiceNumber: string;
  subscriptionStartDate: string;
}

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading } = useAuth();
  const supabase = createClient();

  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [visible, setVisible] = useState(false);

  const sessionId = searchParams.get('session_id');
  const paymentIntent = searchParams.get('payment_intent');
  const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
  const redirectStatus = searchParams.get('redirect_status');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/sign-in');
    }
  }, [user, loading, router]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (user) {
      // If redirected back from Stripe 3DS with a payment_intent param, confirm it first
      if (paymentIntent && redirectStatus === 'succeeded') {
        confirmAndLoad(paymentIntent);
      } else {
        loadSubscriptionDetails();
      }
    }
  }, [user]);

  const confirmAndLoad = async (paymentIntentId: string) => {
    try {
      await supabase.functions.invoke('confirm-payment', {
        body: { paymentIntentId, userId: user?.id },
      });
    } catch (err) {
      console.error('3DS confirm error:', err);
    }
    loadSubscriptionDetails();
  };

  const loadSubscriptionDetails = async () => {
    setLoadingDetails(true);
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const nextDate = new Date();
        nextDate.setMonth(nextDate.getMonth() + 1);

        const startDate = data.created_at
          ? new Date(data.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

        // Generate a human-readable order ID from stripe_subscription_id or stripe_customer_id
        const rawId = data.stripe_subscription_id || data.stripe_customer_id || data.id || '';
        const shortId = rawId.replace(/^(sub_|cus_|pi_)/, '').slice(-10).toUpperCase();
        const orderId = shortId ? `CC-${shortId}` : `CC-${Date.now().toString(36).toUpperCase()}`;

        // Invoice number: INV- + year + month + short id
        const now = new Date();
        const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${shortId || Date.now().toString(36).toUpperCase().slice(-6)}`;

        setSubscription({
          plan: 'CourtCraft Advocate — Full Access',
          amount: data.currency === 'GBP' ? '£35' : data.currency === 'USD' ? '$32' : data.currency === 'EUR' ? '€30' : data.currency === 'CAD' ? 'C$44' : data.currency === 'AUD' ? 'A$49' : 'NZ$54',
          currency: data.currency || 'GBP',
          status: data.status || 'active',
          nextBillingDate: nextDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          email: user?.email || '',
          orderId,
          invoiceNumber,
          subscriptionStartDate: startDate,
        });

        // Send payment confirmation email as client-side fallback ONLY ONCE per session
        // (webhook already sends it — this guard prevents duplicate emails)
        const emailSentKey = `cc_payment_email_sent_${user?.id}`;
        const alreadySent = typeof window !== 'undefined' && sessionStorage.getItem(emailSentKey);
        if (user?.email && data.status === 'active' && !alreadySent) {
          try {
            sessionStorage.setItem(emailSentKey, '1');
            await supabase.functions.invoke('send-email', {
              body: {
                type: 'payment_confirmation',
                to: user.email,
                fullName: profile?.full_name || user.email,
                currency: data.currency || 'GBP',
                amount: data.amount || 35,
              },
            });
          } catch (emailErr) {
            console.warn('Payment confirmation email failed:', emailErr);
          }
        }
      } else {
        // Fallback if subscription record not yet written by webhook
        const now = new Date();
        const fallbackShortId = Date.now().toString(36).toUpperCase().slice(-10);
        setSubscription({
          plan: 'CourtCraft Advocate — Full Access',
          amount: '£35',
          currency: 'GBP',
          status: 'active',
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          email: user?.email || '',
          orderId: `CC-${fallbackShortId}`,
          invoiceNumber: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${fallbackShortId.slice(-6)}`,
          subscriptionStartDate: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        });
      }
    } catch (err) {
      console.error('Error loading subscription:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const nextSteps = [
    {
      icon: 'HomeIcon',
      title: 'Go to Dashboard',
      description: 'Access your personalised case management hub and AI tools.',
      href: '/dashboard',
      cta: 'Open Dashboard',
      primary: true,
    },
    {
      icon: 'WrenchScrewdriverIcon',
      title: 'Explore AI Tools',
      description: 'Use the document builder, case timeline, and AI legal assistant.',
      href: '/document-builder',
      cta: 'Explore Tools',
      primary: false,
    },
    {
      icon: 'EnvelopeIcon',
      title: 'Verify Your Email',
      description: 'Check your inbox for a confirmation email from CourtCraft Advocate.',
      href: null,
      cta: null,
      primary: false,
    },
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
            <Link href="/dashboard" className="text-xs text-white text-opacity-50 hover:text-gold-400 transition-colors flex items-center gap-1">
              <Icon name="ArrowRightIcon" size={12} />
              Skip to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10 sm:py-16">
        <div className="w-full max-w-2xl">

          {/* Success Icon */}
          <div
            className="text-center mb-8"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            <div className="relative mx-auto mb-5 w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-green-500 bg-opacity-15" />
              <div className="absolute inset-0 rounded-full bg-green-500 bg-opacity-10 animate-ping" style={{ animationDuration: '2.5s' }} />
              <div className="relative w-24 h-24 rounded-full flex items-center justify-center">
                <Icon name="CheckCircleIcon" size={48} className="text-green-400" />
              </div>
            </div>
            <h1 className="font-display font-900 text-3xl sm:text-4xl text-white mb-2">
              Payment Successful!
            </h1>
            <p className="text-white text-opacity-60 text-sm sm:text-base max-w-md mx-auto">
              Your CourtCraft Advocate subscription is now active. Welcome aboard — you have full access to all features.
            </p>
          </div>

          {/* Subscription Details Card */}
          <div
            className="bg-navy-900 border border-gold-500 border-opacity-20 rounded-2xl p-5 sm:p-6 mb-6"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s ease 0.15s',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gold-500 bg-opacity-15 flex items-center justify-center flex-shrink-0">
                <Icon name="CreditCardIcon" size={16} className="text-gold-400" />
              </div>
              <h2 className="font-display font-700 text-base text-white">Subscription Confirmation</h2>
            </div>

            {loadingDetails ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 bg-white bg-opacity-5 rounded animate-pulse" />
                ))}
              </div>
            ) : subscription ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-white border-opacity-5">
                  <span className="text-xs text-white text-opacity-50">Order ID</span>
                  <span className="text-xs text-gold-400 font-700 font-mono tracking-wide">{subscription.orderId}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white border-opacity-5">
                  <span className="text-xs text-white text-opacity-50">Invoice</span>
                  <span className="text-xs text-white font-600 font-mono">{subscription.invoiceNumber}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white border-opacity-5">
                  <span className="text-xs text-white text-opacity-50">Plan</span>
                  <span className="text-xs text-white font-600">{subscription.plan}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white border-opacity-5">
                  <span className="text-xs text-white text-opacity-50">Amount Paid</span>
                  <span className="text-xs text-green-400 font-700">{subscription.amount} / month</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white border-opacity-5">
                  <span className="text-xs text-white text-opacity-50">Subscription Start</span>
                  <span className="text-xs text-white font-600">{subscription.subscriptionStartDate}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white border-opacity-5">
                  <span className="text-xs text-white text-opacity-50">Status</span>
                  <span className="flex items-center gap-1.5 text-xs text-green-400 font-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white border-opacity-5">
                  <span className="text-xs text-white text-opacity-50">Next Billing Date</span>
                  <span className="text-xs text-white font-600">{subscription.nextBillingDate}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-white text-opacity-50">Confirmation sent to</span>
                  <span className="text-xs text-gold-400 font-600 truncate max-w-[180px]">{subscription.email}</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Next Steps */}
          <div
            className="mb-6"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s ease 0.3s',
            }}
          >
            <h2 className="font-display font-700 text-sm text-white text-opacity-60 uppercase tracking-widest mb-3 px-1">
              Next Steps
            </h2>
            <div className="space-y-3">
              {nextSteps.map((step, i) => (
                <div
                  key={i}
                  className="bg-navy-900 border border-white border-opacity-10 rounded-2xl p-4 flex items-center gap-4"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateX(0)' : 'translateX(-10px)',
                    transition: `all 0.5s ease ${0.35 + i * 0.1}s`,
                  }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${step.primary ? 'bg-gold-500 bg-opacity-20' : 'bg-white bg-opacity-5'}`}>
                    <Icon name={step.icon as any} size={18} className={step.primary ? 'text-gold-400' : 'text-white text-opacity-50'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-600 leading-tight">{step.title}</p>
                    <p className="text-xs text-white text-opacity-45 mt-0.5 leading-relaxed">{step.description}</p>
                  </div>
                  {step.href && step.cta && (
                    <Link
                      href={step.href}
                      className={`flex-shrink-0 text-xs font-600 px-3 py-1.5 rounded-lg transition-colors ${
                        step.primary
                          ? 'bg-gold-500 text-navy-900 hover:bg-gold-400' :'border border-white border-opacity-15 text-white text-opacity-60 hover:text-white hover:border-opacity-30'
                      }`}
                    >
                      {step.cta}
                    </Link>
                  )}
                  {!step.href && (
                    <span className="flex-shrink-0 text-xs text-white text-opacity-30 px-3 py-1.5">
                      Check inbox
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Primary CTA */}
          <div
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'all 0.5s ease 0.65s',
            }}
          >
            <Link
              href="/dashboard"
              className="btn-gold justify-center py-4 w-full flex items-center gap-2 rounded-2xl font-700 text-sm"
            >
              <Icon name="HomeIcon" size={18} className="text-navy-900" />
              Go to My Dashboard
            </Link>
            <p className="text-center text-xs text-white text-opacity-30 mt-3">
              Need help?{' '}
              <a href="mailto:support@courtcraftadvocate.com" className="text-gold-400 hover:underline">
                Contact support
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
