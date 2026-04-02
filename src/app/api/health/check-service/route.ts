import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'admin-session-courtcraft-2024';

function isAdminAuthenticated(request: NextRequest): boolean {
  const sessionCookie = request.cookies.get('admin_session')?.value;
  return sessionCookie === ADMIN_SESSION_SECRET;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service');

  if (!service || !['supabase', 'anthropic', 'stripe'].includes(service)) {
    return NextResponse.json({ error: 'Invalid service. Use: supabase, anthropic, stripe' }, { status: 400 });
  }

  const start = Date.now();
  let result: { status: string; latencyMs: number; statusCode?: number; error?: string };

  try {
    if (service === 'supabase') {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { error } = await supabase.from('user_profiles').select('id').limit(1);
      const latencyMs = Date.now() - start;
      if (error) {
        result = { status: 'degraded', latencyMs, error: error.message };
      } else {
        result = { status: latencyMs > 3000 ? 'degraded' : 'healthy', latencyMs, statusCode: 200 };
      }
    } else if (service === 'anthropic') {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        result = { status: 'down', latencyMs: Date.now() - start, error: 'ANTHROPIC_API_KEY is not configured' };
      } else {
        // Use direct fetch to Anthropic API to validate the actual key
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'ping' }],
          }),
        });

        const latencyMs = Date.now() - start;

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const errorMsg = body?.error?.message || `HTTP ${res.status}`;
          result = { status: 'down', latencyMs, statusCode: res.status, error: errorMsg };
        } else {
          result = { status: latencyMs > 5000 ? 'degraded' : 'healthy', latencyMs, statusCode: 200 };
        }
      }
    } else {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        result = { status: 'down', latencyMs: Date.now() - start, error: 'STRIPE_SECRET_KEY is not configured' };
      } else {
        const stripe = new Stripe(secretKey, { apiVersion: '2025-01-27.acacia' });
        await stripe.balance.retrieve();
        const latencyMs = Date.now() - start;
        result = { status: latencyMs > 3000 ? 'degraded' : 'healthy', latencyMs, statusCode: 200 };
      }
    }
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    result = { status: 'down', latencyMs, statusCode: err?.statusCode || err?.status, error: err.message };
  }

  return NextResponse.json({
    service,
    ...result,
    checkedAt: new Date().toISOString(),
  });
}
