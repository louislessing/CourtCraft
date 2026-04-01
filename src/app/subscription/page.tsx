'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { getStripe } from '@/lib/stripe/client';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import toast, { Toaster } from 'react-hot-toast';
import SuccessModal from '@/components/ui/SuccessModal';
import { trackSubscriptionConversion } from '@/lib/analytics';
import BackButton from '@/components/ui/BackButton';

const currencyMap: Record<string, { symbol: string; price: number; name: string; flag: string }> = {
  GB: { symbol: '£', price: 35, name: 'GBP', flag: '🇬🇧' },
  US: { symbol: '$', price: 32, name: 'USD', flag: '🇺🇸' },
  CA: { symbol: 'C$', price: 44, name: 'CAD', flag: '🇨🇦' },
  AU: { symbol: 'A$', price: 49, name: 'AUD', flag: '🇦🇺' },
  NZ: { symbol: 'NZ$', price: 54, name: 'NZD', flag: '🇳🇿' },
  IE: { symbol: '€', price: 30, name: 'EUR', flag: '🇮🇪' },
};

interface CheckoutFormProps {
  clientSecret: string;
  userId: string;
  onSuccess: () => void;
}

function CheckoutForm({ clientSecret, userId, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const supabase = createClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [processingStep, setProcessingStep] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);
    setError('');
    setProcessingStep('Validating payment details...');

    const processingToast = toast.loading('Processing your payment...', {
      style: { background: '#0d1526', color: '#fff', border: '1px solid rgba(201,168,76,0.3)' },
    });

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/payment/success`,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      toast.dismiss(processingToast);
      toast.error(confirmError.message || 'Payment failed. Please try again.', {
        duration: 5000,
        style: { background: '#1a0a0a', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
        icon: '❌',
      });
      setError(confirmError.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
      setProcessingStep('');
      // Redirect to failure page with error info
      const errorCode = (confirmError as any).code || 'default';
      const errorMsg = encodeURIComponent(confirmError.message || 'Payment failed. Please try again.');
      window.location.href = `/payment/failure?error_code=${errorCode}&error_message=${errorMsg}`;
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      setProcessingStep('Activating your subscription...');
      toast.loading('Activating your subscription...', {
        id: processingToast,
        style: { background: '#0d1526', color: '#fff', border: '1px solid rgba(201,168,76,0.3)' },
      });
      try {
        const { data, error: confirmErr } = await supabase.functions.invoke('confirm-payment', {
          body: { paymentIntentId: paymentIntent.id, userId },
        });
        if (confirmErr) {
          console.error('Confirm payment error:', confirmErr, data);
        }
        toast.dismiss(processingToast);
        trackSubscriptionConversion({ currency: 'GBP', value: 35, plan: 'monthly' });
        onSuccess();
      } catch (err) {
        toast.dismiss(processingToast);
        console.error('Confirm payment error:', err);
        trackSubscriptionConversion({ currency: 'GBP', value: 35, plan: 'monthly' });
        onSuccess(); // Still show success if payment went through
      }
    } else if (paymentIntent?.status === 'requires_action' || paymentIntent?.status === 'processing') {
      // 3DS or async payment — Stripe will redirect to return_url
      // The success page will handle confirmation via payment_intent param
      toast.dismiss(processingToast);
      toast.loading('Completing 3D Secure verification...', {
        style: { background: '#0d1526', color: '#fff', border: '1px solid rgba(201,168,76,0.3)' },
      });
    }
    setIsProcessing(false);
    setProcessingStep('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-navy-800 border border-gold-500 border-opacity-20 rounded-2xl p-4 sm:p-5">
        <PaymentElement
          options={{
            layout: { type: 'tabs', defaultCollapsed: false },
            fields: { billingDetails: { address: { country: 'never' } } },
          }}
        />
      </div>
      {error && (
        <div
          className="flex items-start gap-3 p-3 rounded-2xl bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30"
          style={{ animation: 'ccShake 0.4s ease' }}
        >
          <Icon name="ExclamationCircleIcon" size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400 leading-relaxed">{error}</p>
        </div>
      )}
      {processingStep && (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gold-500 bg-opacity-10 border border-gold-500 border-opacity-30">
          <div className="w-3 h-3 border-2 border-gold-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-xs text-gold-400">{processingStep}</p>
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="btn-gold justify-center py-4 w-full disabled:opacity-50 relative overflow-hidden text-sm sm:text-base"
        style={{ minHeight: '52px' }}
      >
        {isProcessing ? (
          <><div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" /><span>Processing...</span></>
        ) : (
          <><Icon name="ShieldCheckIcon" size={18} className="text-navy-900" /><span>Activate Subscription</span></>
        )}
      </button>
    </form>
  );
}

export default function SubscriptionPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const supabase = createClient();

  const [currency, setCurrency] = useState('GB');
  const [clientSecret, setClientSecret] = useState('');
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [subscription, setSubscription] = useState<any>(null);
  const [success, setSuccess] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const stripePromise = getStripe();

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) loadSubscription();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes('America')) setCurrency('US');
    else if (tz.includes('Toronto') || tz.includes('Vancouver')) setCurrency('CA');
    else if (tz.includes('Sydney') || tz.includes('Melbourne')) setCurrency('AU');
    else if (tz.includes('Auckland')) setCurrency('NZ');
    else if (tz.includes('Dublin')) setCurrency('IE');
  }, [user]);

  const loadSubscription = async () => {
    if (!user) return;
    const { data } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle();
    setSubscription(data);
  };

  const handleInitiatePayment = async () => {
    if (!user) return;
    setLoadingPayment(true);
    setPaymentError('');

    const initToast = toast.loading('Setting up secure payment...', {
      style: { background: '#0d1526', color: '#fff', border: '1px solid rgba(201,168,76,0.3)' },
    });

    try {
      const curr = currencyMap[currency];
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          userId: user.id,
          email: user.email,
          fullName: profile?.full_name || user.user_metadata?.full_name || 'CourtCraft Advocate User',
          currency: curr.name,
          stripeCustomerId: profile?.stripe_customer_id || null,
        },
      });

      if (error) throw new Error((data as any)?.error ?? error.message);
      toast.dismiss(initToast);
      toast.success('Payment form ready — enter your card details below', {
        duration: 3000,
        style: { background: '#0a1a0a', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
        icon: '🔒',
      });
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      toast.dismiss(initToast);
      toast.error(err?.message || 'Failed to initialise payment. Please try again.', {
        duration: 5000,
        style: { background: '#1a0a0a', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
      });
      setPaymentError(err?.message || 'Failed to initialise payment. Please try again.');
    } finally {
      setLoadingPayment(false);
    }
  };

  const handleSuccess = async () => {
    setSuccess(true);
    setShowSuccessModal(true);
    // Send payment confirmation email — only once per session to avoid duplicates with webhook
    const emailSentKey = `cc_payment_email_sent_${user?.id}`;
    const alreadySent = typeof window !== 'undefined' && sessionStorage.getItem(emailSentKey);
    if (!alreadySent) {
      try {
        const curr = currencyMap[currency];
        sessionStorage.setItem(emailSentKey, '1');
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'payment_confirmation',
            to: user?.email,
            fullName: profile?.full_name || 'CourtCraft Advocate User',
            currency: curr.name,
            amount: curr.price,
          },
        });
        toast.success('Confirmation email sent to ' + user?.email, {
          duration: 4000,
          style: { background: '#0a1a0a', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
          icon: '📧',
        });
      } catch (e) {
        console.warn('Payment confirmation email failed:', e);
      }
    }
  };

  const handleModalCta = () => {
    setShowSuccessModal(false);
    router.replace('/dashboard');
  };

  const curr = currencyMap[currency];

  if (loading) {
    return <div className="min-h-screen bg-navy-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-4 sm:p-6">
      <Toaster
        position="top-center"
        containerStyle={{ top: 16 }}
        toastOptions={{ style: { maxWidth: '90vw' } }}
      />

      <style>{`
        @keyframes ccShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .feature-item {
          animation: fadeSlideIn 0.4s ease forwards;
          opacity: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .feature-item {
            animation: none;
            opacity: 1 !important;
          }
        }
      `}</style>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        title="Subscription Activated!"
        message="Your CourtCraft Advocate subscription is now active. You have full access to all features."
        subMessage="A confirmation email has been sent to your inbox."
        ctaLabel="Go to Dashboard →"
        onCta={handleModalCta}
        onClose={handleModalCta}
        icon="ShieldCheckIcon"
        variant="gold"
      />

      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8 justify-center">
          <AppLogo size={36} iconName="ScaleIcon" />
          <span className="font-display font-900 text-xl text-white">Court<span className="text-gold-500">Craft</span></span>
        </div>

        <div className="mb-4">
          <BackButton className="text-white/60 hover:text-gold-400" />
        </div>

        {success && !showSuccessModal ? (
          <div className="bg-navy-900 border border-gold-500 border-opacity-20 rounded-3xl p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500 bg-opacity-20 flex items-center justify-center mx-auto">
              <Icon name="CheckCircleIcon" size={32} className="text-green-400" />
            </div>
            <h2 className="font-display font-800 text-2xl text-white">Subscription Activated!</h2>
            <p className="text-white text-opacity-60">Your CourtCraft Advocate subscription is now active. Redirecting to your dashboard...</p>
          </div>
        ) : subscription?.status === 'active' ? (
          <div className="bg-navy-900 border border-gold-500 border-opacity-20 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gold-gradient flex items-center justify-center mx-auto mb-4">
                <Icon name="ShieldCheckIcon" size={28} className="text-navy-900" />
              </div>
              <h2 className="font-display font-800 text-2xl text-white mb-2">Active Subscription</h2>
              <p className="text-white text-opacity-60">Your CourtCraft Advocate subscription is active.</p>
            </div>
            <div className="bg-navy-800 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white text-opacity-50">Status</span>
                <span className="text-green-400 font-700">Active ✓</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white text-opacity-50">Amount</span>
                <span className="text-white">£{subscription?.amount}/month</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white text-opacity-50">Next billing</span>
                <span className="text-white">{subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('en-GB') : '—'}</span>
              </div>
            </div>
            <Link href="/dashboard" className="btn-gold justify-center py-4 block text-center">
              <Icon name="Squares2X2Icon" size={18} className="text-navy-900" />
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="bg-navy-900 border border-gold-500 border-opacity-20 rounded-3xl p-5 sm:p-8 space-y-5 sm:space-y-6">
            <div className="text-center">
              <h2 className="font-display font-800 text-xl sm:text-2xl text-white mb-2">Activate Your Subscription</h2>
              <p className="text-white text-opacity-60 text-sm">Full access to CourtCraft Advocate for {curr.flag} {curr.symbol}{curr.price}/month</p>
            </div>

            {/* Currency selector — wraps on small screens */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {Object.entries(currencyMap).map(([code, c]) => (
                <button
                  key={code}
                  onClick={() => {
                    setCurrency(code);
                    if (clientSecret) {
                      setClientSecret('');
                      toast('Currency changed — please re-initiate payment', {
                        icon: 'ℹ️',
                        style: { background: '#0d1526', color: '#fff', border: '1px solid rgba(201,168,76,0.3)' },
                      });
                    }
                  }}
                  title={c.name}
                  className={`text-xl transition-all touch-manipulation ${currency === code ? 'opacity-100 scale-110' : 'opacity-40 hover:opacity-70'}`}
                  style={{ minWidth: '36px', minHeight: '36px' }}
                >
                  {c.flag}
                </button>
              ))}
            </div>

            {/* Features */}
            <div className="space-y-2.5 sm:space-y-3">
              {[
                'AI Legal Assistant — UK Family Law Trained',
                'Document Builder — 50+ court templates',
                'Case Management — All trackers & timeline',
                'Court Date Calendar & Reminders',
                'Live Support Chat 24/7',
              ].map((feature, i) => (
                <div
                  key={feature}
                  className="feature-item flex items-center gap-3"
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  <div className="w-5 h-5 rounded-full bg-gold-gradient flex items-center justify-center flex-shrink-0">
                    <Icon name="CheckIcon" size={12} className="text-navy-900" />
                  </div>
                  <span className="text-sm text-white">{feature}</span>
                </div>
              ))}
            </div>

            {/* Price */}
            <div className="bg-navy-800 rounded-2xl p-4 text-center">
              <p className="font-display font-900 text-3xl text-gold-400">{curr.symbol}{curr.price}<span className="text-lg text-white text-opacity-50">/month</span></p>
              <p className="text-xs text-white text-opacity-60 mt-1">Cancel anytime. No hidden fees.</p>
            </div>

            {paymentError && (
              <div
                className="flex items-start gap-3 p-3 rounded-2xl bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30"
                style={{ animation: 'ccShake 0.4s ease' }}
              >
                <Icon name="ExclamationCircleIcon" size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400 leading-relaxed">{paymentError}</p>
              </div>
            )}

            {!clientSecret ? (
              <button
                onClick={handleInitiatePayment}
                disabled={loadingPayment}
                className="btn-gold justify-center py-4 w-full disabled:opacity-50 text-sm sm:text-base"
                style={{ minHeight: '52px' }}
              >
                {loadingPayment ? (
                  <><div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" /><span>Setting up payment...</span></>
                ) : (
                  <><Icon name="CreditCardIcon" size={18} className="text-navy-900" /><span>Continue to Payment</span></>
                )}
              </button>
            ) : (
              stripePromise && (
                <div style={{ animation: 'fadeSlideIn 0.5s ease forwards' }}>
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'night',
                        variables: {
                          colorPrimary: '#c9a84c',
                          colorBackground: '#0d1526',
                          colorText: '#ffffff',
                          colorDanger: '#f87171',
                          fontSizeBase: '15px',
                          borderRadius: '10px',
                          spacingUnit: '4px',
                        },
                        rules: {
                          '.Input': { padding: '12px 14px', fontSize: '15px' },
                          '.Input:focus': { boxShadow: '0 0 0 2px rgba(201,168,76,0.4)' },
                          '.Label': { fontSize: '12px', marginBottom: '6px' },
                          '.Tab': { padding: '10px 12px' },
                          '.Tab--selected': { borderColor: '#c9a84c' },
                        },
                      },
                    }}
                  >
                    <CheckoutForm clientSecret={clientSecret} userId={user?.id || ''} onSuccess={handleSuccess} />
                  </Elements>
                </div>
              )
            )}

            <p className="text-center text-xs text-white text-opacity-50">
              Secured by Stripe. Your payment information is encrypted.
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-xs text-white text-opacity-35 hover:text-gold-400 transition-colors">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
