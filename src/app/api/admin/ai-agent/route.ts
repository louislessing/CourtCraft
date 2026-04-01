import { NextRequest, NextResponse } from 'next/server';
import { completion } from '@rocketnew/llm-sdk';

function isAdminAuthenticated(request: NextRequest): boolean {
  const cookie = request.cookies.get('admin_authenticated')?.value;
  return cookie === 'true';
}

const SYSTEM_PROMPT = `You are CourtCraft's internal AI diagnostic and support agent. You have deep knowledge of the CourtCraft Advocate platform — a Next.js 15 application that helps self-represented litigants navigate family court in the UK.

## Platform Architecture
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS v3
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Payments**: Stripe (subscriptions + McKenzie Friend sessions)
- **Email**: Resend API
- **AI**: Anthropic Claude (chat completion via /api/ai/chat-completion)
- **Deployment**: Vercel (courtcraft5759.builtwithrocket.new / courtcraftadvocate.com)

## Key Database Tables
user_profiles, subscriptions, cases, mckenzie_sessions, ai_engagement_metrics, ai_conversation_history, court_filings, case_intake, court_date_reminders, file_uploads, gdpr_requests, email_verification_codes, child_contacts, insight_schedules, conversation_sessions

## Key API Routes
- /api/admin/auth — Admin login/logout
- /api/admin/data — Dashboard stats
- /api/admin/health-alerts — Send health alert emails
- /api/admin/diagnostics — Run system diagnostics
- /api/health — Service health checks (Supabase, Anthropic, Stripe)
- /api/ai/chat-completion — AI chat (Anthropic)
- /api/payment/confirm — Payment confirmation
- /api/auth/* — User authentication flows
- /api/email/trial-countdown — Subscription expiry emails

## Supabase Edge Functions
- create-checkout-session, confirm-payment, stripe-webhook
- create-mckenzie-session-intent, confirm-mckenzie-session
- send-email, court-date-reminders, scheduled-insights

## Common Issues & Fixes
1. **Admin redirect loop**: Cookie name mismatch — check for 'admin_authenticated' (not 'admin_session')
2. **Supabase RLS errors**: Ensure service role key is used for admin queries, not anon key
3. **Stripe webhook failures**: STRIPE_WEBHOOK_SECRET must match the Stripe dashboard webhook endpoint secret
4. **Email not sending**: Verify RESEND_API_KEY and that the sending domain is verified in Resend
5. **Auth callback errors**: Check /auth/callback route and Supabase redirect URL configuration
6. **Build failures**: Usually TypeScript errors — check for missing types or incorrect imports
7. **Edge function errors**: Check Supabase dashboard logs; ensure environment variables are set in Supabase project settings

## Your Role
- Diagnose errors and issues described by the admin
- Suggest specific, actionable fixes with file paths and code snippets when relevant
- Explain what might be causing a problem in plain English
- Help interpret diagnostic check results
- Provide guidance on Supabase, Stripe, Resend, and Next.js issues
- Be concise but thorough — admins need actionable answers, not essays
- Always reference specific file paths when suggesting code changes
- If you're unsure, say so clearly rather than guessing

Respond in a professional but direct tone. Use markdown formatting for code snippets and file paths.`;

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { messages: Array<{ role: string; content: string }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC API key is not configured' }, { status: 400 });
  }

  try {
    const allMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await completion({
      model: 'claude-sonnet-4-5-20250929',
      messages: allMessages,
      stream: false,
      api_key: apiKey,
      max_tokens: 2048,
    });

    const text = (response as any)?.choices?.[0]?.message?.content ?? '';
    const usage = (response as any)?.usage ?? null;

    return NextResponse.json({ message: text, usage });
  } catch (err: any) {
    console.error('AI Agent error:', err);
    return NextResponse.json(
      { error: err.message || 'AI agent request failed' },
      { status: err?.statusCode || err?.status || 500 }
    );
  }
}
