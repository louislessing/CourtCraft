'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import AppLogo from '@/components/ui/AppLogo';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';
import VerificationCodeInput from '@/components/auth/VerificationCodeInput';
import { trackSignup, trackSubscriptionConversion } from '@/lib/analytics';
import { getStripe } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/client';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import BackButton from '@/components/ui/BackButton';

const currencyMap: Record<string, { symbol: string; price: number; name: string; flag: string }> = {
  GB: { symbol: '£', price: 35, name: 'GBP', flag: '🇬🇧' },
  US: { symbol: '$', price: 32, name: 'USD', flag: '🇺🇸' },
  CA: { symbol: 'C$', price: 44, name: 'CAD', flag: '🇨🇦' },
  AU: { symbol: 'A$', price: 49, name: 'AUD', flag: '🇦🇺' },
  NZ: { symbol: 'NZ$', price: 54, name: 'NZD', flag: '🇳🇿' },
  IE: { symbol: '€', price: 30, name: 'EUR', flag: '🇮🇪' },
};

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const isSuppressedAuthError = (msg: string): boolean => {
  const lower = msg.toLowerCase();
  return (
    lower.includes('rate limit') ||
    lower.includes('over_request_rate_limit') ||
    lower.includes('too many requests') ||
    lower.includes('refresh token not found') ||
    lower.includes('invalid refresh token') ||
    lower.includes('refresh_token_not_found') ||
    lower.includes('authapieerror') ||
    lower.includes('invalid jwt') ||
    lower.includes('jwt expired') ||
    lower.includes('token has expired') ||
    lower.includes('session_not_found')
  );
};

const passwordStrength = (p: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 1) return { score, label: 'Very weak', color: 'bg-red-500' };
  if (score === 2) return { score, label: 'Weak', color: 'bg-orange-500' };
  if (score === 3) return { score, label: 'Fair', color: 'bg-yellow-500' };
  if (score === 4) return { score, label: 'Strong', color: 'bg-green-400' };
  return { score, label: 'Very strong', color: 'bg-emerald-400' };
};

interface SignupErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  agreeTerms?: string;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 mt-1.5 text-xs text-red-400">
      <Icon name="ExclamationCircleIcon" size={12} className="flex-shrink-0" />
      {msg}
    </p>
  );
}

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, color } = passwordStrength(password);
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? color : 'bg-navy-600'}`}
          />
        ))}
      </div>
      <p className="text-xs text-navy-400">{label}</p>
    </div>
  );
}

// ── Inline Stripe Checkout Form ──────────────────────────────────────────────
interface CheckoutFormProps {
  clientSecret: string;
  userId: string;
  userEmail: string;
  fullName: string;
  currency: string;
  amount: number;
  onSuccess: () => void;
}

function CheckoutForm({ clientSecret, userId, userEmail, fullName, currency, amount, onSuccess }: CheckoutFormProps) {
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

    try {
      // Step 1: Submit the elements form first (required by Stripe Payment Element)
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Please check your payment details and try again.');
        setIsProcessing(false);
        setProcessingStep('');
        return;
      }

      setProcessingStep('Processing payment...');

      // Step 2: Confirm the payment
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/payment/success`,
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed. Please try again.');
        setIsProcessing(false);
        setProcessingStep('');
        return;
      }

      if (!paymentIntent) {
        setError('Payment could not be confirmed. Please try again.');
        setIsProcessing(false);
        setProcessingStep('');
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        setProcessingStep('Activating your subscription...');
        try {
          // Use Next.js API route for reliable server-side confirmation
          const confirmRes = await fetch('/api/payment/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentIntentId: paymentIntent.id, userId }),
          });
          if (!confirmRes.ok) {
            console.error('Confirm payment API error:', await confirmRes.text());
          }
          // Send payment confirmation email
          const emailSentKey = `cc_payment_email_sent_${userId}`;
          const alreadySent = typeof window !== 'undefined' && sessionStorage.getItem(emailSentKey);
          if (!alreadySent) {
            sessionStorage.setItem(emailSentKey, '1');
            await supabase.functions.invoke('send-email', {
              body: {
                type: 'payment_confirmation',
                to: userEmail,
                fullName,
                currency,
                amount,
              },
            }).catch(() => {});
          }
          trackSubscriptionConversion({ currency, value: amount, plan: 'monthly' });
        } catch (err) {
          console.error('Confirm payment error:', err);
          trackSubscriptionConversion({ currency, value: amount, plan: 'monthly' });
        }
        setIsProcessing(false);
        setProcessingStep('');
        onSuccess();
        return;
      }

      if (paymentIntent.status === 'requires_action') {
        setProcessingStep('Redirecting for authentication...');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setError('Additional authentication is required. Please complete the 3D Secure verification.');
        setIsProcessing(false);
        setProcessingStep('');
        return;
      }

      if (paymentIntent.status === 'processing') {
        setIsProcessing(false);
        setProcessingStep('');
        setError('Your payment is being processed. You will receive a confirmation email shortly.');
        return;
      }

      setError(`Payment status: ${paymentIntent.status}. Please try again or use a different payment method.`);
      setIsProcessing(false);
      setProcessingStep('');
    } catch (unexpectedError: any) {
      console.error('Unexpected payment error:', unexpectedError);
      setError(unexpectedError?.message || 'An unexpected error occurred. Please try again.');
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <PaymentElement
          options={{
            layout: { type: 'tabs', defaultCollapsed: false },
          }}
        />
      </div>
      {error && (
        <div className="flex items-start gap-3 p-3 rounded-2xl bg-red-50 border border-red-200">
          <Icon name="ExclamationCircleIcon" size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-600 leading-relaxed">{error}</p>
        </div>
      )}
      {processingStep && (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gold-50 border border-gold-200">
          <div className="w-3 h-3 border-2 border-gold-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-xs text-gold-700">{processingStep}</p>
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="btn-gold justify-center py-4 w-full disabled:opacity-50"
      >
        {isProcessing ? (
          <><div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" /><span>Processing...</span></>
        ) : (
          <><Icon name="ShieldCheckIcon" size={18} className="text-navy-900" /><span>Activate Subscription</span></>
        )}
      </button>
      <p className="text-center text-xs text-navy-400 flex items-center justify-center gap-1.5">
        <Icon name="LockClosedIcon" size={12} className="text-navy-400" />
        Secured by Stripe. Your payment information is encrypted.
      </p>
    </form>
  );
}

// ── Payment Step Wrapper ─────────────────────────────────────────────────────
interface PaymentStepProps {
  userId: string;
  userEmail: string;
  fullName: string;
  currency: string;
  onSuccess: () => void;
}

function PaymentStep({ userId, userEmail, fullName, currency, onSuccess }: PaymentStepProps) {
  const supabase = createClient();
  const stripePromise = getStripe();
  const curr = currencyMap[currency] || currencyMap['GB'];
  const [clientSecret, setClientSecret] = useState('');
  const [loadingPayment, setLoadingPayment] = useState(true);
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    initiatePayment();
  }, []);

  const initiatePayment = async () => {
    setLoadingPayment(true);
    setPaymentError('');
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          userId,
          email: userEmail,
          fullName: fullName || 'CourtCraft Advocate User',
          currency: curr.name,
          stripeCustomerId: null,
        },
      });
      if (error) throw new Error((data as any)?.error ?? error.message);
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      setPaymentError(err?.message || 'Failed to initialise payment. Please try again.');
    } finally {
      setLoadingPayment(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-sm mx-auto lg:mx-0">
      {/* Step header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-gold-100 border border-gold-300 flex items-center justify-center flex-shrink-0">
          <Icon name="CreditCardIcon" size={20} className="text-gold-600" />
        </div>
        <div>
          <h2 className="font-display font-900 text-2xl text-navy-900">Complete Payment</h2>
          <p className="text-xs text-navy-500">Step 3 of 3 — Activate your subscription</p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {['Account', 'Verified', 'Payment'].map((label, i) => (
          <React.Fragment key={label}>
            <div className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-700 ${i < 2 ? 'bg-green-500 text-white' : 'bg-gold-500 text-navy-900'}`}>
                {i < 2 ? <Icon name="CheckIcon" size={10} /> : '3'}
              </div>
              <span className={`text-xs font-600 ${i < 2 ? 'text-green-600' : 'text-gold-600'}`}>{label}</span>
            </div>
            {i < 2 && <div className="flex-1 h-px bg-green-300" />}
          </React.Fragment>
        ))}
      </div>

      {/* Plan summary */}
      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-700 text-navy-900">CourtCraft Advocate</span>
          <span className="text-sm font-900 text-gold-600">{curr.flag} {curr.symbol}{curr.price}/mo</span>
        </div>
        <div className="space-y-1.5">
          {['AI Legal Assistant', 'Document Builder (50+ templates)', 'Case Management & Timeline', 'Court Date Reminders', 'Live Support Chat 24/7'].map((f) => (
            <div key={f} className="flex items-center gap-2">
              <Icon name="CheckCircleIcon" size={13} className="text-green-500 flex-shrink-0" />
              <span className="text-xs text-navy-600">{f}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-navy-400 mt-3 pt-3 border-t border-gray-200">Cancel anytime. No hidden fees.</p>
      </div>

      {/* Payment form */}
      {loadingPayment ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-navy-500">Setting up secure payment...</p>
        </div>
      ) : paymentError ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-red-50 border border-red-200">
            <Icon name="ExclamationCircleIcon" size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 leading-relaxed">{paymentError}</p>
          </div>
          <button onClick={initiatePayment} className="btn-gold justify-center py-3 w-full text-sm">
            <Icon name="ArrowPathIcon" size={16} className="text-navy-900" />
            Try Again
          </button>
        </div>
      ) : clientSecret && stripePromise ? (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#c9a84c',
                colorText: '#0d1526',
                fontSizeBase: '15px',
                borderRadius: '10px',
              },
              rules: {
                '.Input': { padding: '12px 14px', fontSize: '15px' },
                '.Input:focus': { boxShadow: '0 0 0 2px rgba(201,168,76,0.4)', borderColor: '#c9a84c' },
                '.Label': { fontSize: '12px', marginBottom: '6px', color: '#4a5568' },
              },
            },
          }}
        >
          <CheckoutForm
            clientSecret={clientSecret}
            userId={userId}
            userEmail={userEmail}
            fullName={fullName}
            currency={curr.name}
            amount={curr.price}
            onSuccess={onSuccess}
          />
        </Elements>
      ) : null}

      {/* Skip link */}
      <p className="text-center text-xs text-navy-400">
        Already subscribed or want to pay later?{' '}
        <button
          type="button"
          onClick={onSuccess}
          className="text-gold-600 font-700 hover:text-gold-700 underline underline-offset-2"
        >
          Go to Dashboard
        </button>
      </p>
    </div>
  );
}

// ── Main Register Page ───────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const { signIn, user, loading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [currency, setCurrency] = useState('GB');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    country: 'GB',
    agreeTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Email verification state
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const pendingSignupRef = useRef<{
    email: string;
    password: string;
    fullName: string;
    country: string;
  } | null>(null);

  // Payment step state
  const [paymentStep, setPaymentStep] = useState(false);
  const [createdUserId, setCreatedUserId] = useState('');
  const paymentStepRef = useRef(false);

  const [signupErrors, setSignupErrors] = useState<SignupErrors>({});
  const [signupTouched, setSignupTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes('America')) setCurrency('US');
    else if (tz.includes('Toronto') || tz.includes('Vancouver')) setCurrency('CA');
    else if (tz.includes('Sydney') || tz.includes('Melbourne')) setCurrency('AU');
    else if (tz.includes('Auckland')) setCurrency('NZ');
    else if (tz.includes('Dublin')) setCurrency('IE');
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && user && !paymentStep && !paymentStepRef.current) {
      router.replace('/onboarding');
    }
  }, [user, loading, router, paymentStep]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const curr = currencyMap[currency];

  const validateSignupField = (field: string, value: string | boolean, allData = formData): SignupErrors => {
    let errs: SignupErrors = { ...signupErrors };

    if (field === 'fullName') {
      const v = value as string;
      if (!v.trim()) errs.fullName = 'Full name is required.';
      else if (v.trim().length < 2) errs.fullName = 'Name must be at least 2 characters.';
      else if (v.trim().split(' ').length < 2) errs.fullName = 'Please enter your first and last name.';
      else delete errs.fullName;
    }

    if (field === 'email') {
      const v = value as string;
      if (!v.trim()) errs.email = 'Email address is required.';
      else if (!isValidEmail(v)) errs.email = 'Please enter a valid email address.';
      else delete errs.email;
    }

    if (field === 'password') {
      const v = value as string;
      if (!v) errs.password = 'Password is required.';
      else if (v.length < 8) errs.password = 'Password must be at least 8 characters.';
      else if (!/[A-Z]/.test(v)) errs.password = 'Include at least one uppercase letter.';
      else if (!/[0-9]/.test(v)) errs.password = 'Include at least one number.';
      else delete errs.password;
      if (signupTouched.confirmPassword) {
        const confirm = field === 'confirmPassword' ? (value as string) : allData.confirmPassword;
        if (confirm && confirm !== (value as string)) errs.confirmPassword = 'Passwords do not match.';
        else if (confirm) delete errs.confirmPassword;
      }
    }

    if (field === 'confirmPassword') {
      const v = value as string;
      const pw = allData.password;
      if (!v) errs.confirmPassword = 'Please confirm your password.';
      else if (v !== pw) errs.confirmPassword = 'Passwords do not match.';
      else delete errs.confirmPassword;
    }

    if (field === 'agreeTerms') {
      if (!value) errs.agreeTerms = 'You must agree to the Terms of Service.';
      else delete errs.agreeTerms;
    }

    return errs;
  };

  const handleSignupChange = (field: string, value: string | boolean) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    if (signupTouched[field]) {
      setSignupErrors(validateSignupField(field, value, updated));
    }
  };

  const handleSignupBlur = (field: string) => {
    setSignupTouched((prev) => ({ ...prev, [field]: true }));
    setSignupErrors(validateSignupField(field, (formData as Record<string, unknown>)[field] as string | boolean, formData));
  };

  const sendVerificationCode = async (email: string, fullName: string) => {
    const res = await fetch('/api/auth/send-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, fullName }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to send verification code');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const allTouched = { fullName: true, email: true, password: true, confirmPassword: true, agreeTerms: true };
    setSignupTouched(allTouched);

    let errs: SignupErrors = {};
    errs = validateSignupField('fullName', formData.fullName, formData);
    errs = { ...errs, ...validateSignupField('email', formData.email, formData) };
    errs = { ...errs, ...validateSignupField('password', formData.password, formData) };
    errs = { ...errs, ...validateSignupField('confirmPassword', formData.confirmPassword, formData) };
    errs = { ...errs, ...validateSignupField('agreeTerms', formData.agreeTerms, formData) };
    setSignupErrors(errs);

    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    try {
      pendingSignupRef.current = {
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        country: formData.country,
      };

      await sendVerificationCode(formData.email, formData.fullName);

      setVerificationStep(true);
      setVerificationCode('');
      setVerifyError('');
      setResendCooldown(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification email. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError('');

    if (verificationCode.replace(/\D/g, '').length < 6) {
      setVerifyError('Please enter the complete 6-digit code.');
      return;
    }

    if (!pendingSignupRef.current) {
      setVerifyError('Session expired. Please start over.');
      return;
    }

    setVerifySubmitting(true);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingSignupRef.current.email,
          code: verificationCode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.verified) {
        setVerifyError(data.error || 'Invalid code. Please try again.');
        return;
      }

      const { email, password, fullName, country } = pendingSignupRef.current;
      const signupRes = await fetch('/api/auth/complete-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          country,
          currency: currencyMap[country]?.name || 'GBP',
          amount: currencyMap[country]?.price || 35,
        }),
      });

      const signupData = await signupRes.json();
      if (!signupRes.ok) {
        if (signupRes.status === 429 || (signupData.error ?? '').toLowerCase().includes('rate limit') || (signupData.error ?? '').toLowerCase().includes('too many')) {
          setVerifyError('Too many requests. Please wait 60 seconds and try again.');
        } else {
          setVerifyError(signupData.error || 'Failed to create account. Please try again.');
        }
        return;
      }

      // Sign in the user — set paymentStepRef BEFORE signIn to prevent the
      // useEffect redirect from firing before setPaymentStep(true) takes effect.
      paymentStepRef.current = true;
      await signIn(email, password);
      trackSignup('email');

      // Store userId and move to payment step
      setCreatedUserId(signupData.userId || '');
      setPaymentStep(true);
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : 'Verification failed. Please try again.';
      const lowerMsg = rawMsg.toLowerCase();
      if (lowerMsg.includes('rate limit') || lowerMsg.includes('too many') || lowerMsg.includes('over_request_rate_limit')) {
        setVerifyError('Too many requests. Please wait 60 seconds and try again.');
      } else if (isSuppressedAuthError(rawMsg)) {
        // Silently ignore
      } else {
        setVerifyError(rawMsg);
      }
    } finally {
      setVerifySubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || !pendingSignupRef.current) return;
    setVerifyError('');
    try {
      await sendVerificationCode(pendingSignupRef.current.email, pendingSignupRef.current.fullName);
      setResendCooldown(60);
      setVerificationCode('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend code.';
      setVerifyError(msg);
    }
  };

  const handlePaymentSuccess = () => {
    router.replace('/onboarding');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && !paymentStep && !paymentStepRef.current) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex overflow-hidden">
      {/* Left Panel — Cinematic */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12">
        <div className="absolute inset-0">
          <AppImage
            src="https://img.rocket.new/generatedImages/rocket_gen_img_15ee05778-1772799906782.png"
            alt="British courtroom interior with wooden benches and ornate architecture"
            fill
            priority
            className="object-cover object-center"
            sizes="50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950/95 via-navy-900/80 to-navy-950/90" />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 60% at 30% 40%, rgba(201,168,76,0.07), transparent)' }} />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <AppLogo size={40} iconName="ScaleIcon" />
          <div>
            <span className="font-display font-900 text-xl text-white tracking-tight">
              Court<span className="text-gold-500">Craft</span>
            </span>
            <p className="label-tag text-gold-500 opacity-70" style={{ fontSize: '8px' }}>Advocate</p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="w-8 h-px bg-gold-500" />
          <h1 className="hero-title-sm text-white">
            Your Rights.<br />
            <span className="shimmer-gold">Your Voice.</span><br />
            Your Court.
          </h1>
          <p className="text-white text-opacity-60 text-lg leading-relaxed max-w-md">
            Built for parents navigating family court alone. Professional tools, AI guidance, and McKenzie Friend support — all for{' '}
            <span suppressHydrationWarning>
              {mounted ? `${curr.flag} ${curr.symbol}${curr.price}` : '£35'}/month
            </span>.
          </p>

          <div className="flex flex-col gap-4 pt-4">
            {[
              {
                name: 'Rebecca Hartley',
                location: 'Manchester, UK',
                role: 'Child Arrangements — Won Primary Residence',
                text: 'CourtCraft Advocate gave me the confidence to represent myself. I won primary residence of my two children after a 14-month battle.',
                verified: true,
                outcome: '✓ Successful Outcome',
              },
              {
                name: 'James Okafor',
                location: 'London, UK',
                role: 'Financial Remedy — £180k Settlement',
                text: 'The document builder alone saved me thousands in solicitor fees. My Form E was court-ready and the judge commended its clarity.',
                verified: true,
                outcome: '✓ Verified Member',
              },
            ].map((review) => (
              <div key={review.name} className="glass-navy rounded-2xl p-5">
                <p className="text-sm text-white text-opacity-75 italic mb-3">"{review.text}"</p>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-display font-700 text-gold-400">{review.name}</p>
                      {review.verified && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/20 border border-green-500/40">
                          <svg className="w-2.5 h-2.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-green-400 font-600" style={{ fontSize: '8px' }}>VERIFIED</span>
                        </span>
                      )}
                    </div>
                    <p className="label-tag text-white text-opacity-40" style={{ fontSize: '9px' }}>{review.location} · {review.role}</p>
                  </div>
                  <span className="text-xs text-green-400 font-600 whitespace-nowrap" style={{ fontSize: '9px' }}>{review.outcome}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="font-display font-700 text-gold-500 tracking-widest uppercase text-sm">
            Prepare. Represent. Prevail.™
          </p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 py-6 sm:px-8 lg:px-16 overflow-y-auto bg-white min-h-screen lg:min-h-0">
        <div className="mb-4">
          <BackButton label="Back" />
        </div>
        <div className="lg:hidden flex items-center gap-3 mb-6 sm:mb-8">
          <AppLogo size={32} iconName="ScaleIcon" />
          <span className="font-display font-900 text-xl text-navy-900">
            Court<span className="text-gold-500">Craft</span>
          </span>
        </div>

        {/* ── Step 3: Payment ── */}
        {paymentStep && pendingSignupRef.current ? (
          <PaymentStep
            userId={createdUserId}
            userEmail={pendingSignupRef.current.email}
            fullName={pendingSignupRef.current.fullName}
            currency={pendingSignupRef.current.country}
            onSuccess={handlePaymentSuccess}
          />
        ) : verificationStep && pendingSignupRef.current ? (
          /* ── Step 2: Email Verification ── */
          <form onSubmit={handleVerifyCode} className="flex flex-col gap-6 w-full max-w-sm mx-auto lg:mx-0" noValidate>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gold-100 border border-gold-300 flex items-center justify-center flex-shrink-0">
                <Icon name="EnvelopeIcon" size={20} className="text-gold-600" />
              </div>
              <div>
                <h2 className="font-display font-900 text-2xl text-navy-900">Verify Your Email</h2>
                <p className="text-xs text-navy-500">Step 2 of 3 — Account locked until verified</p>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center gap-2">
              {['Account', 'Verify', 'Payment'].map((label, i) => (
                <React.Fragment key={label}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-700 ${i === 0 ? 'bg-green-500 text-white' : i === 1 ? 'bg-gold-500 text-navy-900' : 'bg-gray-200 text-gray-500'}`}>
                      {i === 0 ? <Icon name="CheckIcon" size={10} /> : i + 1}
                    </div>
                    <span className={`text-xs font-600 ${i === 0 ? 'text-green-600' : i === 1 ? 'text-gold-600' : 'text-gray-400'}`}>{label}</span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-px ${i === 0 ? 'bg-green-300' : 'bg-gray-200'}`} />}
                </React.Fragment>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <p className="text-sm text-navy-700 leading-relaxed">
                We've sent a <span className="text-gold-600 font-700">6-digit verification code</span> to:
              </p>
              <p className="text-sm text-gold-600 font-700 mt-1 break-all">
                {pendingSignupRef.current.email}
              </p>
              <p className="text-xs text-navy-400 mt-2">
                Check your inbox and spam folder. Code expires in 15 minutes.
              </p>
            </div>

            {verifyError && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-red-50 border border-red-200">
                <Icon name="ExclamationCircleIcon" size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">{verifyError}</p>
              </div>
            )}

            <div className="space-y-3">
              <label className="label-tag text-navy-500 block text-center" style={{ fontSize: '10px' }}>
                ENTER VERIFICATION CODE
              </label>
              <VerificationCodeInput value={verificationCode} onChange={setVerificationCode} />
            </div>

            <button
              type="submit"
              disabled={verifySubmitting || verificationCode.replace(/\D/g, '').length < 6}
              className="btn-gold justify-center py-4 disabled:opacity-50"
            >
              {verifySubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Icon name="ShieldCheckIcon" size={18} className="text-navy-900" />
                  Verify &amp; Continue to Payment
                </>
              )}
            </button>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setVerificationStep(false);
                  setVerificationCode('');
                  setVerifyError('');
                  pendingSignupRef.current = null;
                }}
                className="text-xs text-navy-400 hover:text-gold-600 transition-colors"
              >
                ← Change email
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0}
                className="text-xs text-gold-600 hover:text-gold-700 font-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>
          </form>
        ) : (
          /* ── Step 1: Registration Form ── */
          <form onSubmit={handleSignUp} className="flex flex-col gap-5 w-full max-w-sm mx-auto lg:mx-0" noValidate>
            <div>
              <h2 className="font-display font-900 text-3xl text-navy-900 mb-1">Register Now</h2>
              <p className="text-sm text-navy-500">{curr.symbol}{curr.price}/month. Cancel anytime.</p>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center gap-2">
              {['Account', 'Verify', 'Payment'].map((label, i) => (
                <React.Fragment key={label}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-700 ${i === 0 ? 'bg-gold-500 text-navy-900' : 'bg-gray-200 text-gray-500'}`}>
                      {i + 1}
                    </div>
                    <span className={`text-xs font-600 ${i === 0 ? 'text-gold-600' : 'text-gray-400'}`}>{label}</span>
                  </div>
                  {i < 2 && <div className="flex-1 h-px bg-gray-200" />}
                </React.Fragment>
              ))}
            </div>

            {/* Currency detection notice */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-gold-50 border border-gold-200">
              <Icon name="MapPinIcon" size={16} className="text-gold-600 flex-shrink-0" />
              <p className="text-xs text-navy-700">
                {curr.flag} Pricing in <span className="text-gold-600 font-700">{curr.name}</span> — {curr.symbol}{curr.price}/month
              </p>
              <div className="flex gap-1 ml-auto">
                {Object.entries(currencyMap).map(([code, c]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCurrency(code)}
                    title={c.name}
                    className={`text-sm transition-all ${currency === code ? 'opacity-100' : 'opacity-30 hover:opacity-70'}`}
                  >
                    {c.flag}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-red-50 border border-red-200">
                <Icon name="ExclamationCircleIcon" size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="label-tag text-navy-500 block mb-2" style={{ fontSize: '10px' }}>Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Your full name"
                    className={`input-light transition-all ${signupErrors.fullName && signupTouched.fullName ? 'border-red-400 focus:border-red-400' : ''}`}
                    value={formData.fullName}
                    onChange={(e) => handleSignupChange('fullName', e.target.value)}
                    onBlur={() => handleSignupBlur('fullName')}
                  />
                </div>
                <FieldError msg={signupTouched.fullName ? signupErrors.fullName : undefined} />
              </div>

              {/* Email */}
              <div>
                <label className="label-tag text-navy-500 block mb-2" style={{ fontSize: '10px' }}>Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className={`input-light transition-all ${signupErrors.email && signupTouched.email ? 'border-red-400 focus:border-red-400' : ''}`}
                    value={formData.email}
                    onChange={(e) => handleSignupChange('email', e.target.value)}
                    onBlur={() => handleSignupBlur('email')}
                  />
                </div>
                <FieldError msg={signupTouched.email ? signupErrors.email : undefined} />
              </div>

              {/* Password */}
              <div>
                <label className="label-tag text-navy-500 block mb-2" style={{ fontSize: '10px' }}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    className={`input-light pr-11 transition-all ${signupErrors.password && signupTouched.password ? 'border-red-400 focus:border-red-400' : ''}`}
                    value={formData.password}
                    onChange={(e) => handleSignupChange('password', e.target.value)}
                    onBlur={() => handleSignupBlur('password')}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600">
                    <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
                  </button>
                </div>
                <PasswordStrengthBar password={formData.password} />
                <FieldError msg={signupTouched.password ? signupErrors.password : undefined} />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="label-tag text-navy-500 block mb-2" style={{ fontSize: '10px' }}>Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    className={`input-light transition-all ${signupErrors.confirmPassword && signupTouched.confirmPassword ? 'border-red-400 focus:border-red-400' : ''}`}
                    value={formData.confirmPassword}
                    onChange={(e) => handleSignupChange('confirmPassword', e.target.value)}
                    onBlur={() => handleSignupBlur('confirmPassword')}
                  />
                  {signupTouched.confirmPassword && !signupErrors.confirmPassword && formData.confirmPassword && (
                    <Icon name="CheckCircleIcon" size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />
                  )}
                </div>
                <FieldError msg={signupTouched.confirmPassword ? signupErrors.confirmPassword : undefined} />
              </div>

              {/* Country */}
              <div>
                <label className="label-tag text-navy-500 block mb-2" style={{ fontSize: '10px' }}>Country / Jurisdiction</label>
                <div className="relative">
                  <select
                    className="input-light appearance-none cursor-pointer"
                    value={formData.country}
                    onChange={(e) => {
                      setFormData({ ...formData, country: e.target.value });
                      setCurrency(e.target.value);
                    }}
                  >
                    <option value="GB">🇬🇧 United Kingdom</option>
                    <option value="US">🇺🇸 United States</option>
                    <option value="CA">🇨🇦 Canada</option>
                    <option value="AU">🇦🇺 Australia</option>
                    <option value="NZ">🇳🇿 New Zealand</option>
                    <option value="IE">🇮🇪 Ireland</option>
                  </select>
                </div>
              </div>

              {/* Terms */}
              <div>
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handleSignupChange('agreeTerms', !formData.agreeTerms)}
                    className={`w-5 h-5 rounded flex-shrink-0 mt-0.5 border-2 flex items-center justify-center transition-all ${formData.agreeTerms ? 'bg-gold-500 border-gold-500' : signupErrors.agreeTerms && signupTouched.agreeTerms ? 'border-red-400' : 'border-gray-300'}`}
                  >
                    {formData.agreeTerms && <Icon name="CheckIcon" size={12} className="text-navy-900" />}
                  </button>
                  <label
                    className="text-xs text-navy-600 leading-relaxed cursor-pointer"
                    onClick={() => handleSignupChange('agreeTerms', !formData.agreeTerms)}
                  >
                    I understand CourtCraft Advocate provides McKenzie Friend lay support services only, not regulated legal advice. I agree to the{' '}
                    <Link href="/terms" className="text-gold-600 hover:text-gold-700">Terms of Service</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-gold-600 hover:text-gold-700">Privacy Policy</Link>.
                  </label>
                </div>
                <FieldError msg={signupTouched.agreeTerms ? signupErrors.agreeTerms : undefined} />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-gold justify-center py-4 disabled:opacity-50">
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                  Sending Verification Code...
                </>
              ) : (
                <>
                  <Icon name="ShieldCheckIcon" size={18} className="text-navy-900" />
                  Continue — Verify Email
                </>
              )}
            </button>

            {/* SSL Secure badge */}
            <div className="flex items-center justify-center gap-2 py-1">
              <Icon name="LockClosedIcon" size={12} className="text-green-500 flex-shrink-0" />
              <span className="text-xs text-navy-400 flex items-center gap-1">
                <span className="text-green-600 font-700">SSL Secure</span> — Your data is encrypted with 256-bit SSL
              </span>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
