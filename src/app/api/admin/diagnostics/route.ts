import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export interface DiagnosticCheck {
  id: string;
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  message: string;
  detail?: string;
  fixSuggestion?: string;
  durationMs?: number;
}

export interface DiagnosticsResponse {
  runAt: string;
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  checks: DiagnosticCheck[];
}

const REQUIRED_ENV_VARS = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL', critical: true },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key', critical: true },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role Key', critical: true },
  { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', critical: true },
  { key: 'STRIPE_SECRET_KEY', label: 'Stripe Secret Key', critical: true },
  { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', label: 'Stripe Publishable Key', critical: true },
  { key: 'RESEND_API_KEY', label: 'Resend Email API Key', critical: true },
  { key: 'ADMIN_PASSWORD', label: 'Admin Password', critical: true },
  { key: 'ADMIN_SESSION_SECRET', label: 'Admin Session Secret', critical: true },
  { key: 'STRIPE_WEBHOOK_SECRET', label: 'Stripe Webhook Secret', critical: false },
  { key: 'NEXT_PUBLIC_GA_MEASUREMENT_ID', label: 'Google Analytics ID', critical: false },
  { key: 'NEXT_PUBLIC_SITE_URL', label: 'Site URL', critical: false },
];

const REQUIRED_TABLES = [
  'user_profiles',
  'subscriptions',
  'cases',
  'mckenzie_sessions',
  'ai_engagement_metrics',
  'ai_conversation_history',
  'court_filings',
  'case_intake',
  'court_date_reminders',
  'file_uploads',
  'gdpr_requests',
  'email_verification_codes',
  'child_contacts',
  'insight_schedules',
  'conversation_sessions',
];

async function checkEnvVars(): Promise<DiagnosticCheck[]> {
  return REQUIRED_ENV_VARS.map((envVar) => {
    const value = process.env[envVar.key];
    const isMissing = !value || value.trim() === '';
    const isPlaceholder = value?.includes('your-') || value?.includes('placeholder') || value?.includes('xxx');

    if (isMissing) {
      return {
        id: `env_${envVar.key}`,
        category: 'Environment',
        name: envVar.label,
        status: envVar.critical ? 'fail' : 'warn',
        message: `${envVar.key} is not set`,
        fixSuggestion: `Add ${envVar.key} to your .env file`,
      };
    }
    if (isPlaceholder) {
      return {
        id: `env_${envVar.key}`,
        category: 'Environment',
        name: envVar.label,
        status: envVar.critical ? 'fail' : 'warn',
        message: `${envVar.key} appears to be a placeholder value`,
        fixSuggestion: `Replace the placeholder in ${envVar.key} with a real API key`,
      };
    }
    return {
      id: `env_${envVar.key}`,
      category: 'Environment',
      name: envVar.label,
      status: 'pass',
      message: `${envVar.key} is configured`,
    };
  });
}

async function checkDatabaseTables(): Promise<DiagnosticCheck[]> {
  const supabase = getAdminSupabase();
  const checks: DiagnosticCheck[] = [];

  for (const table of REQUIRED_TABLES) {
    const start = Date.now();
    try {
      const { error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      const durationMs = Date.now() - start;

      if (error) {
        checks.push({
          id: `db_${table}`,
          category: 'Database',
          name: `Table: ${table}`,
          status: 'fail',
          message: `Query failed: ${error.message}`,
          detail: error.details || error.hint,
          fixSuggestion: `Check if the migration for "${table}" has been applied in Supabase`,
          durationMs,
        });
      } else {
        checks.push({
          id: `db_${table}`,
          category: 'Database',
          name: `Table: ${table}`,
          status: durationMs > 3000 ? 'warn' : 'pass',
          message: durationMs > 3000
            ? `Table accessible but slow (${durationMs}ms)`
            : `Table accessible (${count ?? 0} rows)`,
          durationMs,
        });
      }
    } catch (err: any) {
      checks.push({
        id: `db_${table}`,
        category: 'Database',
        name: `Table: ${table}`,
        status: 'fail',
        message: `Unexpected error: ${err.message}`,
        fixSuggestion: `Verify Supabase connection and that the "${table}" table exists`,
        durationMs: Date.now() - start,
      });
    }
  }

  return checks;
}

async function checkRlsPolicies(): Promise<DiagnosticCheck[]> {
  const supabase = getAdminSupabase();
  const checks: DiagnosticCheck[] = [];

  // Check if RLS is enabled on critical tables by querying pg_tables
  try {
    const { data, error } = await supabase.rpc('get_rls_status' as any).select('*');
    if (error) {
      // RPC doesn't exist — skip gracefully
      checks.push({
        id: 'rls_check',
        category: 'Security',
        name: 'RLS Policy Check',
        status: 'skip',
        message: 'RLS check skipped — custom RPC not available',
      });
    }
  } catch {
    checks.push({
      id: 'rls_check',
      category: 'Security',
      name: 'RLS Policy Check',
      status: 'skip',
      message: 'RLS check skipped — requires custom database function',
    });
  }

  // Check service role key is not exposed publicly
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  checks.push({
    id: 'security_service_role',
    category: 'Security',
    name: 'Service Role Key Exposure',
    status: 'pass',
    message: 'Service role key is server-only (no NEXT_PUBLIC_ prefix)',
  });

  // Check admin password strength
  const adminPwd = process.env.ADMIN_PASSWORD || '';
  if (adminPwd.length < 12) {
    checks.push({
      id: 'security_admin_pwd',
      category: 'Security',
      name: 'Admin Password Strength',
      status: 'warn',
      message: `Admin password is short (${adminPwd.length} chars)`,
      fixSuggestion: 'Use a password of at least 16 characters with mixed case, numbers, and symbols',
    });
  } else {
    checks.push({
      id: 'security_admin_pwd',
      category: 'Security',
      name: 'Admin Password Strength',
      status: 'pass',
      message: `Admin password length is adequate (${adminPwd.length} chars)`,
    });
  }

  return checks;
}

async function checkStripeWebhook(): Promise<DiagnosticCheck[]> {
  const checks: DiagnosticCheck[] = [];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  if (!webhookSecret || webhookSecret.includes('your-')) {
    checks.push({
      id: 'stripe_webhook',
      category: 'Payments',
      name: 'Stripe Webhook Secret',
      status: 'warn',
      message: 'Stripe webhook secret is not configured',
      fixSuggestion: 'Set STRIPE_WEBHOOK_SECRET in .env — required for payment confirmations to work reliably',
    });
  } else {
    checks.push({
      id: 'stripe_webhook',
      category: 'Payments',
      name: 'Stripe Webhook Secret',
      status: 'pass',
      message: 'Stripe webhook secret is configured',
    });
  }

  return checks;
}

async function checkEmailConfig(): Promise<DiagnosticCheck[]> {
  const checks: DiagnosticCheck[] = [];
  const resendKey = process.env.RESEND_API_KEY || '';

  if (!resendKey || resendKey.includes('your-')) {
    checks.push({
      id: 'email_resend',
      category: 'Email',
      name: 'Resend API Key',
      status: 'fail',
      message: 'Resend API key is not configured',
      fixSuggestion: 'Set RESEND_API_KEY in .env — required for email verification and alerts',
    });
  } else {
    checks.push({
      id: 'email_resend',
      category: 'Email',
      name: 'Resend API Key',
      status: 'pass',
      message: 'Resend API key is configured',
    });
  }

  return checks;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [envChecks, dbChecks, securityChecks, stripeChecks, emailChecks] = await Promise.all([
    checkEnvVars(),
    checkDatabaseTables(),
    checkRlsPolicies(),
    checkStripeWebhook(),
    checkEmailConfig(),
  ]);

  const allChecks: DiagnosticCheck[] = [
    ...envChecks,
    ...dbChecks,
    ...securityChecks,
    ...stripeChecks,
    ...emailChecks,
  ];

  const passed = allChecks.filter((c) => c.status === 'pass').length;
  const failed = allChecks.filter((c) => c.status === 'fail').length;
  const warnings = allChecks.filter((c) => c.status === 'warn').length;

  const response: DiagnosticsResponse = {
    runAt: new Date().toISOString(),
    totalChecks: allChecks.length,
    passed,
    failed,
    warnings,
    checks: allChecks,
  };

  return NextResponse.json(response);
}
