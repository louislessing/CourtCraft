import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
    const { email, fullName } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Guard: ensure service role key is configured
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey || serviceRoleKey === 'your-supabase-service-role-key-here') {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    // Use service role client to bypass RLS for verification code operations
    const adminSupabase = createServiceRoleClient();

    // Generate a 6-digit code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Delete any existing unused codes for this email
    await adminSupabase
      .from('email_verification_codes')
      .delete()
      .eq('email', email)
      .is('used_at', null);

    // Insert new code using service role (bypasses RLS)
    const { error: insertError } = await adminSupabase
      .from('email_verification_codes')
      .insert({
        email,
        code,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to generate verification code' }, { status: 500 });
    }

    // Send verification email via Resend through edge function
    const supabase = await createServerClient();
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        type: 'email_verification',
        to: email,
        fullName: fullName || email,
        verificationCode: code,
      },
    });

    if (emailError) {
      console.error('Email send error:', emailError);
      // Don't fail the request — code is stored, user can retry
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Send verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
