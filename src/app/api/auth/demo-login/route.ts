import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEMO_EMAIL = 'demo@courtcraft.io';
const DEMO_PASSWORD = 'Demo1234!';

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Admin client to manage users
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if demo user already exists
    const { data: listData } = await adminClient.auth.admin.listUsers();
    const existingUser = listData?.users?.find((u) => u.email === DEMO_EMAIL);

    if (!existingUser) {
      // Create the demo user
      const { error: createError } = await adminClient.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: 'Demo User',
          is_demo: true,
        },
      });

      if (createError) {
        return NextResponse.json({ error: `Failed to create demo user: ${createError.message}` }, { status: 500 });
      }
    } else {
      // Ensure password is correct by updating it
      const { error: updateError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
        password: DEMO_PASSWORD,
        email_confirm: true,
      });

      if (updateError) {
        return NextResponse.json({ error: `Failed to update demo user: ${updateError.message}` }, { status: 500 });
      }
    }

    // Return success — the client will sign in using the normal signIn flow
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
