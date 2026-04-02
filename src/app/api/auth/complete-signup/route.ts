import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, country, currency, amount } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey || serviceRoleKey === 'your-supabase-service-role-key-here') {
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const adminSupabase = createServiceRoleClient();

    // Create user with email already confirmed (skips Supabase confirmation email)
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || '',
        country: country || 'GB',
      },
    });

    if (error) {
      // If user already exists, try to sign them in to check
      if (error.message?.toLowerCase().includes('already registered') || error.message?.toLowerCase().includes('already been registered')) {
        return NextResponse.json({ error: 'An account with this email already exists. Please sign in.' }, { status: 409 });
      }
      // Rate limit from Supabase Auth admin API
      const lowerMsg = (error.message ?? '').toLowerCase();
      if (
        lowerMsg.includes('rate limit') ||
        lowerMsg.includes('too many') ||
        lowerMsg.includes('over_request_rate_limit') ||
        (error as any).status === 429
      ) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a moment and try again.' },
          { status: 429 }
        );
      }
      console.error('Create user error:', error);
      return NextResponse.json({ error: error.message || 'Failed to create account' }, { status: 500 });
    }

    // Send welcome email (non-blocking)
    try {
      await adminSupabase.functions.invoke('send-email', {
        body: {
          type: 'welcome',
          to: email,
          fullName: fullName || email,
          currency: currency || 'GBP',
          amount: amount || 35,
        },
      });
    } catch (e) {
      console.warn('Welcome email failed:', e);
    }

    return NextResponse.json({ success: true, userId: data.user?.id });
  } catch (error: unknown) {
    console.error('Complete signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
