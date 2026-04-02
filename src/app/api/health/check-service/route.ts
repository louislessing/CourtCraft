import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
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
      const client = new Anthropic({ apiKey });
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      const latencyMs = Date.now() - start;
      const ok = msg.stop_reason === 'end_turn' || msg.stop_reason === 'max_tokens';
      result = { status: ok ? (latencyMs > 5000 ? 'degraded' : 'healthy') : 'degraded', latencyMs, statusCode: 200 };
    } else {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      const stripe = new Stripe(secretKey!, { apiVersion: '2025-01-27.acacia' });
      await stripe.balance.retrieve();
      const latencyMs = Date.now() - start;
      result = { status: latencyMs > 3000 ? 'degraded' : 'healthy', latencyMs, statusCode: 200 };
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
