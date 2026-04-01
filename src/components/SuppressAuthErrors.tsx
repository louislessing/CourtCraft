'use client';

import { useEffect } from 'react';

/**
 * Silently suppresses known Supabase auth errors that are already handled
 * by AuthContext (invalid refresh token, token not found, etc.) so they
 * never appear in the browser console.
 */
export default function SuppressAuthErrors() {
  useEffect(() => {
    const SUPPRESSED_PATTERNS = [
      'Invalid Refresh Token',
      'Refresh Token Not Found',
      'refresh_token_not_found',
      'invalid_refresh_token',
      'AuthApiError',
      'TOKEN_REFRESH_FAILED',
      'Invalid JWT',
      'JWT expired',
      'session_not_found',
      'Failed to fetch',
      'TypeError: Failed to fetch',
      'NetworkError',
      'fetch failed',
    ];

    const originalError = console.error.bind(console);
    const originalWarn = console.warn.bind(console);

    const shouldSuppress = (args: any[]): boolean => {
      const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a ?? ''))).join(' ');
      return SUPPRESSED_PATTERNS.some((p) => msg.includes(p));
    };

    console.error = (...args: any[]) => {
      if (!shouldSuppress(args)) originalError(...args);
    };

    console.warn = (...args: any[]) => {
      if (!shouldSuppress(args)) originalWarn(...args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return null;
}
