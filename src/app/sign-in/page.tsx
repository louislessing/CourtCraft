'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import AppLogo from '@/components/ui/AppLogo';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';
import { trackLogin } from '@/lib/analytics';
import NavigationExpertWidget from '@/components/NavigationExpertWidget';
import BackButton from '@/components/ui/BackButton';
import { createClient } from '@/lib/supabase/client';

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

interface LoginErrors {
  email?: string;
  password?: string;
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

export default function SignInPage() {
  const router = useRouter();
  const { signIn, user, loading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [currency, setCurrency] = useState('GB');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({});
  const [loginTouched, setLoginTouched] = useState<Record<string, boolean>>({});

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [resetError, setResetError] = useState('');

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
    if (!loading && user) {
      // Check onboarding status before redirecting
      const supabase = createClient();
      supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data && data.onboarding_completed === false) {
            router.replace('/onboarding');
          } else {
            router.replace('/dashboard');
          }
        })
        .catch(() => {
          router.replace('/dashboard');
        });
    }
  }, [user, loading, router]);

  const curr = currencyMap[currency];

  const validateLoginField = (field: string, value: string): LoginErrors => {
    let errs: LoginErrors = { ...loginErrors };
    if (field === 'email') {
      if (!value.trim()) errs.email = 'Email address is required.';
      else if (!isValidEmail(value)) errs.email = 'Please enter a valid email address.';
      else delete errs.email;
    }
    if (field === 'password') {
      if (!value) errs.password = 'Password is required.';
      else delete errs.password;
    }
    return errs;
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (loginTouched.email) {
      setLoginErrors(validateLoginField('email', value));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (loginTouched.password) {
      setLoginErrors(validateLoginField('password', value));
    }
  };

  const handleBlur = (field: string, value: string) => {
    setLoginTouched((prev) => ({ ...prev, [field]: true }));
    setLoginErrors(validateLoginField(field, value));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setLoginTouched({ email: true, password: true });
    let errs: LoginErrors = {};
    errs = validateLoginField('email', email);
    errs = { ...errs, ...validateLoginField('password', password) };
    setLoginErrors(errs);

    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);

    const isDemo =
      email.trim().toLowerCase() === 'demo@courtcraft.io' && password === 'Demo1234!';

    try {
      // Try signing in directly — works for all users including demo
      await signIn(email.trim(), password);
      trackLogin('email');
      // Use window.location for a full page navigation so the server-side
      // middleware picks up the newly-set session cookies correctly.
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : '';
      const lowerMsg = rawMsg.toLowerCase();

      // If demo login failed (user may not exist yet), provision via API then retry
      if (isDemo) {
        try {
          const res = await fetch('/api/auth/demo-login', { method: 'POST' });
          const data = await res.json();

          if (!res.ok) {
            setError(data.error || 'Demo login failed. Please try again.');
            setIsSubmitting(false);
            return;
          }

          // Demo user provisioned — try signing in again
          await signIn(email.trim(), password);
          trackLogin('email');
          window.location.href = '/dashboard';
          return;
        } catch (demoErr: unknown) {
          const demoMsg = demoErr instanceof Error ? demoErr.message : 'Demo login failed.';
          setError(demoMsg || 'Demo login failed. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      if (lowerMsg.includes('rate limit') || lowerMsg.includes('too many') || lowerMsg.includes('over_request_rate_limit')) {
        setError('Too many sign-in attempts. Please wait 60 seconds and try again.');
      } else if (
        lowerMsg.includes('invalid login') ||
        lowerMsg.includes('invalid credentials') ||
        lowerMsg.includes('email not confirmed') ||
        lowerMsg.includes('invalid email or password')
      ) {
        setError('Incorrect email or password. Please check your details and try again.');
      } else if (isSuppressedAuthError(rawMsg)) {
        // Silently ignore internal Supabase token/rate-limit errors
      } else {
        setError(rawMsg || 'Sign in failed. Please check your credentials.');
      }
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !isValidEmail(resetEmail)) {
      setResetError('Please enter a valid email address.');
      return;
    }
    setResetSubmitting(true);
    setResetError('');
    try {
      const { createClient: createSupabaseClient } = await import('@/lib/supabase/client');
      const supabase = createSupabaseClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://courtcraftadvocate.com';
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${siteUrl}/auth/callback?type=recovery`,
      });
      if (resetErr) throw resetErr;
      setResetMsg('Password reset email sent! Check your inbox and follow the link to reset your password.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset email. Please try again.';
      if (isSuppressedAuthError(msg)) {
        setResetMsg('If an account exists for this email, a reset link has been sent.');
      } else {
        setResetError(msg);
      }
    } finally {
      setResetSubmitting(false);
    }
  };

  if (loading || user) {
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
            Join thousands of parents who have taken control of their legal journey. Professional tools, AI guidance, and McKenzie Friend support — all for{' '}
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

        {!showForgotPassword ? (
          <form onSubmit={handleSignIn} className="flex flex-col gap-4 sm:gap-5 w-full max-w-sm mx-auto lg:mx-0" noValidate>
            <div>
              <h2 className="font-display font-900 text-2xl sm:text-3xl text-navy-900 mb-1">Welcome Back</h2>
              <p className="text-sm text-navy-500">Sign in to your CourtCraft Advocate account</p>
            </div>

            {/* Demo credentials hint */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50 border border-blue-200">
              <Icon name="InformationCircleIcon" size={16} className="text-blue-500 flex-shrink-0" />
              <p className="text-xs text-navy-600">
                Demo: <span className="text-gold-600 font-700">demo@courtcraft.io</span> / <span className="text-gold-600 font-700">Demo1234!</span>
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-red-50 border border-red-200">
                <Icon name="ExclamationCircleIcon" size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-3 sm:space-y-4">
              {/* Email */}
              <div>
                <label className="label-tag text-navy-500 block mb-2" style={{ fontSize: '10px' }}>Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className={`input-light transition-all ${loginErrors.email && loginTouched.email ? 'border-red-400 focus:border-red-400' : ''}`}
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onBlur={() => handleBlur('email', email)}
                    autoComplete="email"
                  />
                </div>
                <FieldError msg={loginTouched.email ? loginErrors.email : undefined} />
              </div>

              {/* Password */}
              <div>
                <label className="label-tag text-navy-500 block mb-2" style={{ fontSize: '10px' }}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Your password"
                    className={`input-light pr-11 transition-all ${loginErrors.password && loginTouched.password ? 'border-red-400 focus:border-red-400' : ''}`}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    onBlur={() => handleBlur('password', password)}
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600 p-1">
                    <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
                  </button>
                </div>
                <FieldError msg={loginTouched.password ? loginErrors.password : undefined} />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(true); setResetEmail(email); }}
                  className="text-xs text-gold-600 hover:text-gold-700 font-700 py-1"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-gold justify-center py-4 disabled:opacity-50 w-full">
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <Icon name="ArrowRightOnRectangleIcon" size={18} className="text-navy-900" />
                  Sign In to CourtCraft Advocate
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

            <p className="text-center text-xs text-navy-400">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-gold-600 font-700 hover:text-gold-700">
                Register now
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="flex flex-col gap-4 sm:gap-5 w-full max-w-sm mx-auto lg:mx-0" noValidate>
            <div>
              <h2 className="font-display font-900 text-2xl sm:text-3xl text-navy-900 mb-1">Reset Password</h2>
              <p className="text-sm text-navy-500">Enter your email and we&apos;ll send you a reset link.</p>
            </div>

            {resetMsg && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-green-50 border border-green-200">
                <Icon name="CheckCircleIcon" size={16} className="text-green-600 flex-shrink-0" />
                <p className="text-xs text-green-700">{resetMsg}</p>
              </div>
            )}
            {resetError && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-red-50 border border-red-200">
                <Icon name="ExclamationCircleIcon" size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">{resetError}</p>
              </div>
            )}

            {!resetMsg && (
              <div>
                <label className="label-tag text-navy-500 block mb-2" style={{ fontSize: '10px' }}>Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="input-light"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>
            )}

            {!resetMsg && (
              <button type="submit" disabled={resetSubmitting} className="btn-gold justify-center py-4 disabled:opacity-50 w-full">
                {resetSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Icon name="EnvelopeIcon" size={18} className="text-navy-900" />
                    Send Reset Link
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => { setShowForgotPassword(false); setResetMsg(''); setResetError(''); }}
              className="text-center text-xs text-gold-600 hover:text-gold-700 font-700 py-2"
            >
              ← Back to Sign In
            </button>
          </form>
        )}

        <div className="mt-8 w-full max-w-sm mx-auto lg:mx-0">
          <Link href="/homepage" className="flex items-center gap-2 text-xs text-navy-400 hover:text-gold-600 transition-colors py-2">
            <Icon name="ArrowLeftIcon" size={14} />
            Back to CourtCraft.io
          </Link>
        </div>
      </div>

      {/* Navigation Expert Widget — draggable */}
      <NavigationExpertWidget />
    </div>
  );
}
