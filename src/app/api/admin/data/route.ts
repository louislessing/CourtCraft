import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'admin-session-courtcraft-2024';

function isAdminAuthenticated(request: NextRequest): boolean {
  const cookie = request.cookies.get('admin_authenticated')?.value;
  return cookie === 'true';
}

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminSupabase();

  try {
    // Fetch all stats in parallel
    const [
      usersResult,
      subscriptionsResult,
      mckenzieResult,
      casesResult,
      aiMetricsResult,
      recentUsersResult,
      recentSubsResult,
    ] = await Promise.all([
      supabase.from('user_profiles').select('id, email, full_name, created_at, is_active, email_verified', { count: 'exact' }),
      supabase.from('subscriptions').select('id, user_id, status, plan, amount, currency, created_at, stripe_subscription_id', { count: 'exact' }),
      supabase.from('mckenzie_sessions').select('id, user_id, amount, currency, payment_status, status, created_at', { count: 'exact' }),
      supabase.from('cases').select('id, user_id, status, case_type, created_at', { count: 'exact' }),
      supabase.from('ai_engagement_metrics').select('id, user_id, feature_used, created_at', { count: 'exact' }),
      supabase.from('user_profiles').select('id, email, full_name, created_at, is_active, email_verified').order('created_at', { ascending: false }).limit(10),
      supabase.from('subscriptions').select('id, user_id, status, plan, amount, currency, created_at').order('created_at', { ascending: false }).limit(10),
    ]);

    // Calculate revenue from mckenzie sessions
    const mckenzieRevenue = (mckenzieResult.data || [])
      .filter((s: any) => s.payment_status === 'succeeded')
      .reduce((sum: number, s: any) => sum + (s.amount || 0), 0);

    // Subscription stats
    const subs = subscriptionsResult.data || [];
    const activeSubs = subs.filter((s: any) => s.status === 'active').length;
    const trialSubs = subs.filter((s: any) => s.status === 'trialing').length;
    const cancelledSubs = subs.filter((s: any) => s.status === 'cancelled' || s.status === 'canceled').length;

    // User stats
    const users = usersResult.data || [];
    const activeUsers = users.filter((u: any) => u.is_active).length;
    const verifiedUsers = users.filter((u: any) => u.email_verified).length;

    // Case stats
    const cases = casesResult.data || [];
    const activeCases = cases.filter((c: any) => c.status === 'active').length;

    // AI usage
    const aiMetrics = aiMetricsResult.data || [];
    const featureUsage: Record<string, number> = {};
    aiMetrics.forEach((m: any) => {
      const f = m.feature_used || 'unknown';
      featureUsage[f] = (featureUsage[f] || 0) + 1;
    });

    // Monthly signups (last 6 months)
    const now = new Date();
    const monthlySignups = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const count = users.filter((u: any) => {
        const created = new Date(u.created_at);
        return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth();
      }).length;
      return { month: label, count };
    });

    return NextResponse.json({
      stats: {
        totalUsers: usersResult.count || 0,
        activeUsers,
        verifiedUsers,
        totalSubscriptions: subscriptionsResult.count || 0,
        activeSubs,
        trialSubs,
        cancelledSubs,
        totalCases: casesResult.count || 0,
        activeCases,
        totalMckenzieSessions: mckenzieResult.count || 0,
        mckenzieRevenuePence: mckenzieRevenue,
        totalAiInteractions: aiMetricsResult.count || 0,
        featureUsage,
        monthlySignups,
      },
      recentUsers: recentUsersResult.data || [],
      recentSubscriptions: recentSubsResult.data || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch data' }, { status: 500 });
  }
}
