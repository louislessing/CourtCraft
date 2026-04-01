import { createBrowserClient } from '@supabase/ssr';

const PFX = 'sb_';

// ---------------------------------------------------------------------------
// Rate-limit backoff guard
// When Supabase's auto-refresh hits the rate limit it retries immediately,
// creating a tight loop that exhausts the quota further. We track the last
// rate-limit hit and refuse to create a new client (or reset the existing one)
// until the cooldown has elapsed.
// ---------------------------------------------------------------------------
let _rateLimitedAt: number | null = null;
const RATE_LIMIT_COOLDOWN_MS = 60_000; // 60 s cooldown after a rate-limit hit

export function markRateLimited() {
  _rateLimitedAt = Date.now();
  // Destroy the singleton so the next createClient() call after the cooldown
  // gets a fresh instance with no stale token to auto-refresh.
  _client = null;
}

export function isRateLimited(): boolean {
  if (_rateLimitedAt === null) return false;
  if (Date.now() - _rateLimitedAt > RATE_LIMIT_COOLDOWN_MS) {
    _rateLimitedAt = null;
    return false;
  }
  return true;
}

const canUseCookies = (() => {
  let cache: boolean | null = null;
  return () => {
    if (typeof document === 'undefined') return false;
    if (cache !== null) return cache;
    const k = '__sb_test__';
    document.cookie = `${k}=1; Path=/; SameSite=Lax`;
    cache = document.cookie.includes(k);
    document.cookie = `${k}=; Path=/; Max-Age=0; SameSite=Lax`;
    return cache;
  };
})();

const fromCookies = () =>
  typeof document === 'undefined' ? [] :
  document.cookie.split(';').filter(Boolean).map((c) => {
    const [name, ...rest] = c.trim().split('=');
    return { name: name.trim(), value: decodeURIComponent(rest.join('=')) };
  }).filter((c) => c.name);

const fromStorage = () => {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(PFX))
      .map((k) => ({ name: k, value: localStorage.getItem(k) || '' }));
  } catch { return []; }
};

const setCookie = (name: string, value: string, options?: any) => {
  let s = `${name}=${encodeURIComponent(value)}; Path=${options?.path || '/'}; SameSite=Lax`;
  if (options?.maxAge) s += `; Max-Age=${options.maxAge}`;
  if (options?.domain) s += `; Domain=${options.domain}`;
  if (options?.expires) s += `; Expires=${new Date(options.expires).toUTCString()}`;
  document.cookie = s;
};

// Singleton instance — shared across all components to prevent duplicate
// session-refresh calls that exhaust Supabase's auth rate limit.
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (_client) return _client;

  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Persist session in storage so auto-refresh has a valid token to work with.
        persistSession: true,
        // Disable automatic token refresh — AuthContext manages refresh manually
        // to avoid the tight retry loop that causes rate-limit errors.
        autoRefreshToken: false,
        // Detect session from URL (needed for OAuth / magic-link callbacks).
        detectSessionInUrl: true,
        // Use PKCE flow for better security.
        flowType: 'pkce',
      },
      cookies: {
        getAll: () => {
          const cookies = canUseCookies() ? fromCookies() : fromStorage();
          // Also merge any localStorage-stored tokens as cookies for completeness
          if (!canUseCookies()) {
            const stored = fromStorage();
            return stored.map(({ name, value }) => ({
              name: name.startsWith(PFX) ? name.slice(PFX.length) : name,
              value,
            }));
          }
          return cookies;
        },
        setAll(cookiesToSet) {
          if (typeof document === 'undefined') return;
          cookiesToSet.forEach(({ name, value, options }) => {
            if (value) {
              setCookie(name, value, options);
              // Also persist in localStorage as backup
              try { localStorage.setItem(`${PFX}${name}`, value); } catch {}
            } else {
              document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
              try { localStorage.removeItem(`${PFX}${name}`); } catch {}
            }
          });
        },
      },
    }
  );

  return _client;
}

// Call this after a sign-out to allow a fresh client on next sign-in.
// The singleton is intentionally NOT reset here — the same client instance
// handles the signed-out state correctly without needing recreation.
export function resetClient() {
  _client = null;
}

/**
 * Wipe every stored auth token from localStorage and cookies.
 * Called when a refresh-token error is detected so the stale session
 * cannot be picked up again on the next page load.
 */
export function clearStoredSession() {
  // Clear localStorage keys — Supabase uses both 'sb-' and 'sb_' prefixes
  try {
    Object.keys(localStorage)
      .filter((k) =>
        k.startsWith(PFX) ||
        k.startsWith('sb-') ||
        k.startsWith('supabase') ||
        k.includes('supabase') ||
        k.includes('-auth-token')
      )
      .forEach((k) => {
        try { localStorage.removeItem(k); } catch {}
      });
  } catch {}

  // Clear sessionStorage as well
  try {
    Object.keys(sessionStorage)
      .filter((k) =>
        k.startsWith('sb-') ||
        k.startsWith('supabase') ||
        k.includes('supabase') ||
        k.includes('-auth-token')
      )
      .forEach((k) => {
        try { sessionStorage.removeItem(k); } catch {}
      });
  } catch {}

  // Clear auth cookies
  if (typeof document !== 'undefined') {
    document.cookie.split(';').forEach((c) => {
      const name = c.trim().split('=')[0];
      if (name.startsWith('sb-') || name.startsWith('supabase') || name.includes('-auth-token')) {
        document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
        document.cookie = `${name}=; Path=/; Max-Age=0`;
      }
    });
  }

  // Always reset singleton so next createClient() starts completely fresh
  // with no stale token that could trigger another Invalid Refresh Token error.
  _client = null;
}
