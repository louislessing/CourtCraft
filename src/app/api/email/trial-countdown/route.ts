import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // Verify internal secret to prevent unauthorized calls
    const authHeader = req.headers.get('authorization');
    const internalSecret = process.env.INTERNAL_API_SECRET;
    if (internalSecret && authHeader !== `Bearer ${internalSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Find subscriptions in trialing status
    const { data: trialSubs, error } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, trial_end, currency, amount')
      .eq('status', 'trialing')
      .not('trial_end', 'is', null);

    if (error) {
      console.error('Error fetching trial subscriptions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results: { userId: string; type: string; sent: boolean }[] = [];

    for (const sub of trialSubs || []) {
      const trialEnd = new Date(sub.trial_end);
      const msRemaining = trialEnd.getTime() - now.getTime();
      const hoursRemaining = msRemaining / (1000 * 60 * 60);

      // 3-day window: between 72h and 73h remaining
      const is3Day = hoursRemaining >= 71 && hoursRemaining <= 73;
      // 1-day window: between 23h and 25h remaining
      const is1Day = hoursRemaining >= 23 && hoursRemaining <= 25;

      if (!is3Day && !is1Day) continue;

      const emailType = is3Day ? 'trial_countdown_3day' : 'trial_countdown_1day';

      // Get user profile
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('email, full_name')
        .eq('id', sub.user_id)
        .single();

      if (!profile?.email) continue;

      const trialEndFormatted = trialEnd.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const currency = (sub.currency || 'GBP').toUpperCase();
      const amount = sub.amount || 35;

      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            type: emailType,
            to: profile.email,
            fullName: profile.full_name || profile.email,
            trialEndDate: trialEndFormatted,
            currency,
            amount,
          }),
        });

        results.push({ userId: sub.user_id, type: emailType, sent: response.ok });
      } catch (emailErr) {
        console.error(`Failed to send ${emailType} to ${sub.user_id}:`, emailErr);
        results.push({ userId: sub.user_id, type: emailType, sent: false });
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (err: any) {
    console.error('Trial countdown route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
