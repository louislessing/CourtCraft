'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Icon from '@/components/ui/AppIcon';
import SuccessModal from '@/components/ui/SuccessModal';
import { getStripe } from '@/lib/stripe/client';
import type { Stripe } from '@stripe/stripe-js';

const sessionFeatures = [
  { icon: 'DocumentTextIcon', text: 'Case document review & organisation' },
  { icon: 'PencilSquareIcon', text: 'Position statement drafting assistance' },
  { icon: 'FolderOpenIcon', text: 'Evidence bundle preparation' },
  { icon: 'ScaleIcon', text: 'Court procedure guidance' },
  { icon: 'AcademicCapIcon', text: 'Hearing preparation support' },
  { icon: 'ClipboardDocumentListIcon', text: 'Note-taking during sessions' },
];

interface ToastMessage {
  id: number;
  type: 'loading' | 'success' | 'error';
  message: string;
}

function ToastContainer({ toasts }: { toasts: ToastMessage[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border text-sm font-display font-600 transition-all ${
            t.type === 'loading' ?'bg-navy-900 border-gold-500 border-opacity-30 text-white'
              : t.type === 'success' ?'bg-navy-900 border-green-500 border-opacity-30 text-green-400' :'bg-navy-900 border-red-500 border-opacity-30 text-red-400'
          }`}
        >
          {t.type === 'loading' && (
            <div className="w-4 h-4 border-2 border-gold-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
          {t.type === 'success' && <Icon name="CheckCircleIcon" size={16} className="text-green-400 flex-shrink-0" />}
          {t.type === 'error' && <Icon name="ExclamationCircleIcon" size={16} className="text-red-400 flex-shrink-0" />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

interface SessionCheckoutFormProps {
  clientSecret: string;
  userId: string | null;
  onSuccess: () => void;
  onClose: () => void;
  addToast: (type: ToastMessage['type'], message: string, duration?: number) => number;
  dismissToast: (id: number) => void;
}

// Lazy-loaded Stripe checkout — only mounted when user clicks "Register to Book"
function SessionCheckoutForm(props: SessionCheckoutFormProps) {
  const [StripeComponents, setStripeComponents] = useState<{
    Elements: React.ComponentType<any>;
    PaymentElement: React.ComponentType<any>;
    useStripe: () => any;
    useElements: () => any;
  } | null>(null);
  const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null);

  useEffect(() => {
    Promise.all([
      import('@stripe/react-stripe-js'),
      getStripe(),
    ]).then(([stripeReact, stripe]) => {
      setStripeComponents({
        Elements: stripeReact.Elements,
        PaymentElement: stripeReact.PaymentElement,
        useStripe: stripeReact.useStripe,
        useElements: stripeReact.useElements,
      });
      setStripeInstance(stripe);
    });
  }, []);

  if (!StripeComponents || !stripeInstance) return null;

  const { Elements, PaymentElement, useStripe: useStripeHook, useElements: useElementsHook } = StripeComponents;

  function CheckoutForm() {
    const stripe = useStripeHook();
    const elements = useElementsHook();
    const supabase = createClient();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stripe || !elements) return;
      setIsProcessing(true);
      setError('');

      const processingToastId = props.addToast('loading', 'Processing your payment...');

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/dashboard` },
        redirect: 'if_required',
      });

      if (confirmError) {
        props.dismissToast(processingToastId);
        props.addToast('error', confirmError.message || 'Payment failed. Please try again.', 5000);
        setError(confirmError.message || 'Payment failed. Please try again.');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        props.addToast('loading', 'Confirming your session booking...');
        try {
          await supabase.functions.invoke('confirm-mckenzie-session', {
            body: { paymentIntentId: paymentIntent.id, userId: props.userId },
          });
          props.dismissToast(processingToastId);
          props.onSuccess();
        } catch {
          props.dismissToast(processingToastId);
          props.onSuccess();
        }
      }
      setIsProcessing(false);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
        <div className="relative w-full max-w-md bg-navy-900 border border-gold-500 border-opacity-30 rounded-3xl p-8 shadow-2xl">
          <button
            onClick={props.onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-navy-800 flex items-center justify-center text-white text-opacity-50 hover:text-white transition-colors"
          >
            <Icon name="XMarkIcon" size={16} />
          </button>

          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gold-500 bg-opacity-15 flex items-center justify-center">
                <Icon name="UserGroupIcon" size={20} className="text-gold-400" />
              </div>
              <div>
                <h3 className="font-display font-800 text-white text-lg">Book a Session</h3>
                <p className="text-xs text-white text-opacity-50">1-on-1 McKenzie Friend · £50/hour</p>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-gold-500 bg-opacity-10 border border-gold-500 border-opacity-20">
              <p className="text-xs text-gold-400 flex items-center gap-2">
                <Icon name="InformationCircleIcon" size={14} />
                Payment required before session booking is confirmed
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="p-4 rounded-2xl bg-navy-800 border border-navy-600">
              <PaymentElement
                options={{
                  layout: 'tabs',
                  fields: { billingDetails: { name: 'auto', email: 'auto' } },
                  wallets: { applePay: 'never', googlePay: 'never' },
                  terms: { card: 'never' },
                }}
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 flex items-center gap-2">
                <Icon name="ExclamationCircleIcon" size={14} />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full btn-gold py-4 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Icon name="LockClosedIcon" size={16} className="text-navy-900" />
                  Pay £50 & Book Session
                </>
              )}
            </button>

            <p className="text-center text-xs text-white text-opacity-30">
              Secured by Stripe · 256-bit SSL encryption
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripeInstance}
      options={{
        clientSecret: props.clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#c9a84c',
            colorBackground: '#0d1526',
            colorText: '#ffffff',
            colorDanger: '#f87171',
            fontFamily: 'system-ui, sans-serif',
            borderRadius: '12px',
          },
        },
        loader: 'auto',
      }}
    >
      <CheckoutForm />
    </Elements>
  );
}

const McKenzieFriendSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const supabase = createClient();

  const [showCheckout, setShowCheckout] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [isLoadingIntent, setIsLoadingIntent] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastCounter = useRef(0);

  const addToast = (type: ToastMessage['type'], message: string, duration?: number): number => {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    if (duration) {
      setTimeout(() => dismissToast(id), duration);
    }
    return id;
  };

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('revealed');
        });
      },
      { threshold: 0.1 }
    );
    const els = sectionRef.current?.querySelectorAll('.reveal-hidden');
    els?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleRegisterToBook = async () => {
    setIsLoadingIntent(true);
    const loadingToastId = addToast('loading', 'Setting up secure payment...');

    try {
      const { data, error } = await supabase.functions.invoke('create-mckenzie-session-intent', {
        body: {
          userId: user?.id ?? null,
          email: user?.email ?? '',
          fullName: user?.user_metadata?.full_name ?? 'Guest',
        },
      });

      dismissToast(loadingToastId);

      if (error || !data?.clientSecret) {
        addToast('error', 'Unable to set up payment. Please try again.', 4000);
        setIsLoadingIntent(false);
        return;
      }

      setClientSecret(data.clientSecret);
      setShowCheckout(true);
    } catch {
      dismissToast(loadingToastId);
      addToast('error', 'Something went wrong. Please try again.', 4000);
    }

    setIsLoadingIntent(false);
  };

  const handlePaymentSuccess = () => {
    setShowCheckout(false);
    setClientSecret('');
    setShowSuccess(true);
  };

  return (
    <>
      <ToastContainer toasts={toasts} />

      <section ref={sectionRef} id="mckenzie-friend" className="py-16 sm:py-24 px-4 sm:px-6 bg-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full bg-gold-500 opacity-[0.02] blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto relative">
          <div className="reveal-hidden text-center mb-8 sm:mb-14">
            <div className="flex items-center justify-center gap-3 mb-4 sm:mb-5">
              <div className="w-8 h-px bg-gold-500" />
              <span className="label-tag text-gold-500">Professional Support</span>
              <div className="w-8 h-px bg-gold-500" />
            </div>
            <h2 className="section-title text-black mb-3 sm:mb-4">
              1-on-1 McKenzie Friend<br />
              <span className="text-gold-gradient">Pay Per Session</span>
            </h2>
            <p className="text-black text-opacity-60 text-sm sm:text-lg max-w-xl mx-auto">
              Professional lay support sessions — expert guidance when you need it most.
            </p>
          </div>

          <div className="reveal-hidden grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
            <div className="flex flex-col gap-5 sm:gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gold-500 bg-opacity-15 flex items-center justify-center">
                    <Icon name="UserGroupIcon" size={22} className="text-gold-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-800 text-black text-lg sm:text-xl">1-on-1 McKenzie Friend</h3>
                    <p className="text-xs sm:text-sm text-black text-opacity-50">Professional lay support sessions</p>
                  </div>
                </div>
                <p className="text-black text-opacity-60 text-sm leading-relaxed">
                  Work directly with an experienced McKenzie Friend who will guide you through every stage of your case — from document preparation to hearing day support.
                </p>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {sessionFeatures.map((feature) => (
                  <div key={feature.text} className="flex items-center gap-3 sm:gap-4">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black border border-gray-700 flex items-center justify-center flex-shrink-0">
                      <Icon name={feature.icon as any} size={14} className="text-gold-400 opacity-70" />
                    </div>
                    <span className="text-sm text-black text-opacity-65">{feature.text}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { icon: 'LockClosedIcon', label: 'Secure Payment', desc: 'Stripe-protected' },
                  { icon: 'ClockIcon', label: 'Flexible', desc: 'Book anytime' },
                  { icon: 'ShieldCheckIcon', label: 'Confidential', desc: 'Private sessions' },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-1 sm:gap-1.5 p-2 sm:p-3 rounded-2xl bg-navy-800 border border-navy-600 text-center">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gold-500 bg-opacity-10 flex items-center justify-center">
                      <Icon name={item.icon as any} size={14} className="text-gold-400" />
                    </div>
                    <p className="font-display font-700 text-white text-xs leading-tight">{item.label}</p>
                    <p className="text-xs text-white text-opacity-40 hidden sm:block">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative rounded-3xl mt-6 border border-gold-500 border-opacity-30 bg-navy-900 shadow-2xl">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <span className="px-4 sm:px-6 py-2 rounded-full bg-navy-900 border border-gold-500 border-opacity-40 text-gold-400 text-xs font-display font-700 shadow-lg whitespace-nowrap">
                  Pay Per Session
                </span>
              </div>

              <div className="pt-10 pb-6 sm:pb-8 px-5 sm:px-8">
                <div className="text-center mb-3">
                  <div className="flex items-end justify-center gap-1">
                    <span className="font-display font-600 text-white text-opacity-70 text-xl sm:text-2xl mb-1">£</span>
                    <span className="font-display font-900 text-white leading-none" style={{ fontSize: 'clamp(3rem, 12vw, 5rem)' }}>50</span>
                    <span className="font-display font-500 text-white text-opacity-50 text-lg sm:text-xl mb-2">/hour</span>
                  </div>
                </div>

                <p className="text-center text-sm text-white text-opacity-40 mb-5 sm:mb-6">
                  Charged separately — payment required before booking
                </p>

                <div className="divider-gold mb-5 sm:mb-6 mx-auto" />

                <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                  {[
                    'No subscription required',
                    'Book as many sessions as you need',
                    'Experienced, vetted McKenzie Friends',
                    'Confirmation email with session details',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-gold-500 bg-opacity-15 flex items-center justify-center flex-shrink-0">
                        <Icon name="CheckIcon" size={11} className="text-gold-400" />
                      </div>
                      <span className="text-sm text-white text-opacity-65">{item}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleRegisterToBook}
                  disabled={isLoadingIntent}
                  className="w-full btn-gold py-4 justify-center text-base disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoadingIntent ? (
                    <>
                      <div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                      Setting up payment...
                    </>
                  ) : (
                    <>
                      <Icon name="CalendarDaysIcon" size={18} className="text-navy-900" />
                      Register to Book Sessions
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-white text-opacity-25 mt-3">
                  Secure payment via Stripe · Sessions confirmed after payment
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showCheckout && clientSecret && (
        <SessionCheckoutForm
          clientSecret={clientSecret}
          userId={user?.id ?? null}
          onSuccess={handlePaymentSuccess}
          onClose={() => { setShowCheckout(false); setClientSecret(''); }}
          addToast={addToast}
          dismissToast={dismissToast}
        />
      )}

      {showSuccess && (
        <SuccessModal
          isOpen={showSuccess}
          title="Session Booked!"
          message="Your McKenzie Friend session has been confirmed. You'll receive a confirmation email with session details shortly."
          onClose={() => setShowSuccess(false)}
        />
      )}
    </>
  );
};

export default McKenzieFriendSection;
