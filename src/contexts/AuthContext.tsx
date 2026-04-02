'use client';

import { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { createClient, markRateLimited, isRateLimited, clearStoredSession } from '@/lib/supabase/client';

const AuthContext = createContext<any>({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// How often to manually refresh the session (must be less than Supabase's
// 1-hour token expiry). 4 minutes is safe and well within rate limits.
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

// Refresh proactively only when the token expires within this window
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const supabase = useMemo(() => createClient(), []);
  const signingOutRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isTokenError = (err: any): boolean => {
    const msg: string = (err?.message ?? '').toLowerCase();
    const code: string = (err?.code ?? '').toLowerCase();
    const name: string = (err?.name ?? '').toLowerCase();
    return (
      msg.includes('refresh token not found') ||
      msg.includes('invalid refresh token') ||
      msg.includes('refresh_token_not_found') ||
      msg.includes('invalidjwttoken') ||
      msg.includes('invalid jwt') ||
      msg.includes('jwt expired') ||
      msg.includes('token has expired') ||
      msg.includes('session_not_found') ||
      msg.includes('user not found') ||
      code === 'refresh_token_not_found' ||
      code === 'invalid_refresh_token' ||
      code === 'bad_jwt' ||
      code === 'session_not_found' ||
      name === 'authapieerror'
    );
  };

  const isRateLimitError = (err: any): boolean => {
    const msg: string = (err?.message ?? '').toLowerCase();
    const code: string = err?.code ?? '';
    const status: number = err?.status ?? 0;
    return (
      msg.includes('rate limit') ||
      msg.includes('over_request_rate_limit') ||
      msg.includes('too many requests') ||
      code === 'over_request_rate_limit' ||
      status === 429
    );
  };

  const isNetworkError = (err: any): boolean => {
    const msg: string = (err?.message ?? '').toLowerCase();
    return (
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('fetch failed') ||
      msg.includes('network request failed')
    );
  };

  const stopRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  const handleTokenError = async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    stopRefreshTimer();
    // Wipe stale tokens from storage BEFORE signing out so they cannot
    // be re-read by the Supabase client during the sign-out call.
    clearStoredSession();
    // Reset the singleton client so the next createClient() call starts fresh
    // with no stale token — prevents the error from firing again on remount.
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (_) {
      // ignore sign-out errors
    } finally {
      signingOutRef.current = false;
    }
    setSession(null);
    setUser(null);
    setLoading(false);
  };

  // Manually refresh the session — called on an interval instead of relying
  // on Supabase's built-in autoRefreshToken which can create tight retry loops.
  const refreshSession = async () => {
    // Skip if we're in a rate-limit cooldown window
    if (isRateLimited()) return;

    // Skip if the current session is still valid for more than the threshold
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.expires_at) {
        const expiresInMs = currentSession.expires_at * 1000 - Date.now();
        if (expiresInMs > REFRESH_THRESHOLD_MS) return;
      }
    } catch {
      // If getSession fails, proceed with refresh attempt
    }

    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        if (isRateLimitError(error)) {
          // Mark rate limited — stops further refresh attempts for 60 s
          markRateLimited();
          return;
        }
        if (isTokenError(error)) {
          await handleTokenError();
        }
        return;
      }
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
    } catch (err: any) {
      if (isRateLimitError(err)) {
        markRateLimited();
      } else if (isNetworkError(err)) {
        // Transient network error — silently skip, will retry on next interval
        return;
      } else if (isTokenError(err)) {
        await handleTokenError();
      }
    }
  };

  const startRefreshTimer = () => {
    stopRefreshTimer();
    refreshTimerRef.current = setInterval(refreshSession, REFRESH_INTERVAL_MS);
  };

  useEffect(() => {
    const initSession = async () => {
      try {
        let storedSession: any = null;
        let sessionError: any = null;

        try {
          const result = await supabase.auth.getSession();
          storedSession = result.data?.session ?? null;
          sessionError = result.error ?? null;
        } catch (getSessionErr: any) {
          // getSession() itself can throw AuthApiError for invalid refresh tokens
          if (isTokenError(getSessionErr)) {
            await handleTokenError();
            return;
          }
          // Network errors (Failed to fetch) — treat as no session, don't crash
          if (isNetworkError(getSessionErr)) {
            setLoading(false);
            return;
          }
          setLoading(false);
          return;
        }

        if (sessionError) {
          if (isRateLimitError(sessionError)) {
            markRateLimited();
            setLoading(false);
            return;
          }
          if (isTokenError(sessionError)) {
            await handleTokenError();
            return;
          }
          // Unknown session error — treat as no session
          setLoading(false);
          return;
        }

        if (storedSession) {
          // Check if the session is still valid (not expired or close to expiry)
          const expiresInMs = storedSession.expires_at
            ? storedSession.expires_at * 1000 - Date.now()
            : Infinity;

          if (expiresInMs > REFRESH_THRESHOLD_MS) {
            // Session is healthy — use it directly without an extra refresh call
            setSession(storedSession);
            setUser(storedSession.user ?? null);
            setLoading(false);
            startRefreshTimer();
            return;
          }

          // Session is expired or near expiry — attempt a refresh
          if (isRateLimited()) {
            // Can't validate right now — use stored session optimistically
            setSession(storedSession);
            setUser(storedSession.user ?? null);
            setLoading(false);
            return;
          }

          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError) {
            if (isRateLimitError(refreshError)) {
              markRateLimited();
              // Fall back to stored session
              setSession(storedSession);
              setUser(storedSession.user ?? null);
              setLoading(false);
              startRefreshTimer();
              return;
            }
            if (isTokenError(refreshError)) {
              await handleTokenError();
              return;
            }
            // Other refresh error — fall back to stored session
            setSession(storedSession);
            setUser(storedSession.user ?? null);
            setLoading(false);
            startRefreshTimer();
            return;
          }

          if (refreshData.session) {
            setSession(refreshData.session);
            setUser(refreshData.session.user ?? null);
            setLoading(false);
            startRefreshTimer();
            return;
          }
        }

        // No stored session
        setSession(null);
        setUser(null);
      } catch (err: any) {
        if (isRateLimitError(err)) {
          markRateLimited();
        } else if (isTokenError(err)) {
          await handleTokenError();
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle failed token refresh — clears stale tokens and signs out gracefully
      if (event === 'TOKEN_REFRESH_FAILED') {
        // Clear storage synchronously first to prevent re-reads of stale token
        clearStoredSession();
        await handleTokenError();
        return;
      }
      if (event === 'SIGNED_OUT' || session === null) {
        stopRefreshTimer();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session) startRefreshTimer();
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      stopRefreshTimer();
    };
  }, []);

  // Load profile when user changes
  useEffect(() => {
    if (user) {
      supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setProfile(data));
    } else {
      setProfile(null);
    }
  }, [user]);

  const signUp = async (email: string, password: string, metadata: any = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata?.fullName || '',
          avatar_url: metadata?.avatarUrl || '',
          country: metadata?.country || 'GB',
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;

    // Send welcome email
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'welcome',
          to: email,
          fullName: metadata?.fullName || email,
          currency: metadata?.currency || 'GBP',
          amount: metadata?.amount || 35,
        }
      });
    } catch (e) {
      console.warn('Welcome email failed:', e);
    }

    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      if (isRateLimitError(error)) {
        throw new Error('Too many sign-in attempts. Please wait a moment and try again.');
      }
      throw error;
    }
    // Start refresh timer after successful sign-in
    if (data.session) startRefreshTimer();
    return data;
  };

  const signOut = async () => {
    stopRefreshTimer();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const getCurrentUser = async () => {
    const { data: { user: authUser }, error } = await supabase.auth.getUser();
    if (error) return null;
    return authUser ?? null;
  };

  const isEmailVerified = () => {
    return user?.email_confirmed_at !== null;
  };

  const getUserProfile = async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data;
  };

  const getSubscription = async () => {
    if (!user) return null;
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();
    return data;
  };

  const value = {
    user,
    session,
    loading,
    profile,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    isEmailVerified,
    getUserProfile,
    getSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
