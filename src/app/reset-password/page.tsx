'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';

const isValidPassword = (v: string) => v.length >= 8;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // The auth/callback route already exchanged the PKCE code and established
    // a session before redirecting here. We just need to verify the session exists.
    const checkSession = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSessionReady(true);
      } else {
        // No session — redirect back to sign-in
        router.replace('/sign-in');
      }
      setChecking(false);
    };

    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidPassword(password)) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;
      setSuccess(true);
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.replace('/sign-in');
      }, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checking || !sessionReady) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <AppLogo size={36} iconName="ScaleIcon" />
          <span className="font-display font-900 text-xl text-navy-900">
            Court<span className="text-gold-500">Craft</span>
          </span>
        </div>

        {success ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-200">
              <Icon name="CheckCircleIcon" size={20} className="text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-700 text-green-700">Password updated!</p>
                <p className="text-xs text-green-600 mt-0.5">Redirecting you to sign in…</p>
              </div>
            </div>
            <Link href="/sign-in" className="text-center text-xs text-gold-600 hover:text-gold-700 font-700 py-2">
              Go to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <div>
              <h2 className="font-display font-900 text-2xl text-navy-900 mb-1">Set New Password</h2>
              <p className="text-sm text-navy-500">Choose a strong password for your account.</p>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-red-50 border border-red-200">
                <Icon name="ExclamationCircleIcon" size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            {/* New Password */}
            <div>
              <label className="label-tag text-navy-500 block mb-2" style={{ fontSize: '10px' }}>New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  className="input-light pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600 p-1"
                >
                  <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="label-tag text-navy-500 block mb-2" style={{ fontSize: '10px' }}>Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  className="input-light pr-11"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600 p-1"
                >
                  <Icon name={showConfirm ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-gold justify-center py-4 disabled:opacity-50 w-full"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                  Updating…
                </>
              ) : (
                <>
                  <Icon name="LockClosedIcon" size={18} className="text-navy-900" />
                  Update Password
                </>
              )}
            </button>

            <Link href="/sign-in" className="text-center text-xs text-navy-400 hover:text-gold-600 py-1">
              ← Back to Sign In
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
