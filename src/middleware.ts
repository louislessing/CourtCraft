import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const protectedPaths = ['/dashboard', '/case-management', '/document-builder'];
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'admin-session-courtcraft-2024';

function isProtectedPath(pathname: string): boolean {
  return protectedPaths.some((p) => pathname.startsWith(p));
}

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/admin/dashboard') || pathname.startsWith('/admin/creative-studio') || pathname.startsWith('/admin/asset-gallery');
}

function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return url.match(/https:\/\/([^.]+)\./)?.[1] ?? '';
}

function clearAuthCookies(response: NextResponse, request: NextRequest): void {
  const projectRef = getProjectRef();
  request.cookies.getAll().forEach(({ name }) => {
    if (name.startsWith('sb-') && (name.includes('-auth-token') || name.includes('-session'))) {
      response.cookies.set(name, '', { maxAge: 0, path: '/' });
    }
  });
  response.cookies.set(`sb-${projectRef}-auth-token`, '', { maxAge: 0, path: '/' });
  response.cookies.set(`sb-${projectRef}-auth-token-code-verifier`, '', { maxAge: 0, path: '/' });
}

function isTokenError(err: any): boolean {
  const msg: string = err?.message ?? '';
  const code: string = err?.code ?? '';
  return (
    msg.includes('Refresh Token Not Found') ||
    msg.includes('Invalid Refresh Token') ||
    msg.includes('refresh_token_not_found') ||
    msg.includes('InvalidJWTToken') ||
    msg.includes('Invalid JWT') ||
    msg.includes('invalid JWT') ||
    msg.includes('JWT expired') ||
    msg.includes('rate limit') ||
    code === 'refresh_token_not_found' ||
    code === 'invalid_refresh_token' ||
    code === 'bad_jwt' ||
    code === 'session_not_found' ||
    code === 'over_request_rate_limit'
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never redirect API routes — they must always return JSON, not HTML pages
  if (pathname.startsWith('/api/')) {
    return NextResponse.next({ request });
  }

  // Admin route protection — separate from Supabase auth
  if (isAdminPath(pathname)) {
    const adminAuth = request.cookies.get('admin_authenticated')?.value;
    if (adminAuth !== 'true') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  // Only run auth checks for protected routes — avoids hammering the Supabase
  // auth API on every page request and hitting the rate limit.
  if (!isProtectedPath(pathname)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      if (isTokenError(error)) {
        clearAuthCookies(supabaseResponse, request);
      }
    } else if (data.user) {
      user = data.user;
    }
  } catch (err: any) {
    if (isTokenError(err)) {
      clearAuthCookies(supabaseResponse, request);
    }
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      redirectResponse.cookies.set(name, value, options as any);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
