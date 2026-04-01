import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import Stripe from 'stripe';

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'admin-session-courtcraft-2024';

function isAdminAuthenticated(request: NextRequest): boolean {
  const sessionCookie = request.cookies.get('admin_session')?.value;
  return sessionCookie === ADMIN_SESSION_SECRET;
}

export interface ServiceHealthResult {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  statusCode?: number;
  error?: string;
  checkedAt: string;
}

export interface HealthResponse {
  overall: 'healthy' | 'degraded' | 'down';
  services: ServiceHealthResult[];
  checkedAt: string;
  retryQueueDepth: number;
}

async function checkSupabase(): Promise<ServiceHealthResult> {
  const start = Date.now();
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { error } = await supabase.from('user_profiles').select('id').limit(1);
    const latencyMs = Date.now() - start;
    if (error) {
      return { service: 'supabase', status: 'degraded', latencyMs, error: error.message, checkedAt: new Date().toISOString() };
    }
    return { service: 'supabase', status: latencyMs > 3000 ? 'degraded' : 'healthy', latencyMs, statusCode: 200, checkedAt: new Date().toISOString() };
  } catch (err: any) {
    return { service: 'supabase', status: 'down', latencyMs: Date.now() - start, error: err.message, checkedAt: new Date().toISOString() };
  }
}

async function checkAnthropic(): Promise<ServiceHealthResult> {
  const start = Date.now();
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'ping' }],
    });
    const latencyMs = Date.now() - start;
    const ok = msg.stop_reason === 'end_turn' || msg.stop_reason === 'max_tokens';
    return { service: 'anthropic', status: ok ? (latencyMs > 5000 ? 'degraded' : 'healthy') : 'degraded', latencyMs, statusCode: 200, checkedAt: new Date().toISOString() };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const statusCode = err?.status || err?.statusCode;
    return { service: 'anthropic', status: 'down', latencyMs, statusCode, error: err.message, checkedAt: new Date().toISOString() };
  }
}

async function checkStripe(): Promise<ServiceHealthResult> {
  const start = Date.now();
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-01-27.acacia' });
    await stripe.balance.retrieve();
    const latencyMs = Date.now() - start;
    return { service: 'stripe', status: latencyMs > 3000 ? 'degraded' : 'healthy', latencyMs, statusCode: 200, checkedAt: new Date().toISOString() };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const statusCode = err?.statusCode || err?.status;
    return { service: 'stripe', status: 'down', latencyMs, statusCode, error: err.message, checkedAt: new Date().toISOString() };
  }
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [supabaseResult, anthropicResult, stripeResult] = await Promise.all([
    checkSupabase(),
    checkAnthropic(),
    checkStripe(),
  ]);

  const services = [supabaseResult, anthropicResult, stripeResult];
  const hasDown = services.some((s) => s.status === 'down');
  const hasDegraded = services.some((s) => s.status === 'degraded');
  const overall = hasDown ? 'down' : hasDegraded ? 'degraded' : 'healthy';

  const response: HealthResponse = {
    overall,
    services,
    checkedAt: new Date().toISOString(),
    retryQueueDepth: 0,
  };

  return NextResponse.json(response);
}
