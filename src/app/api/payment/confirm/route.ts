import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CURRENCY_AMOUNTS: Record<string, number> = {
  GBP: 35, USD: 32, CAD: 44, AUD: 49, NZD: 54, EUR: 30,
};

export async function POST(req: NextRequest) {
  try {
    const { paymentIntentId, userId } = await req.json();

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded' && userId) {
      const currency = (paymentIntent.metadata?.currency || 'GBP').toUpperCase();
      const amount = CURRENCY_AMOUNTS[currency] ?? paymentIntent.amount / 100;
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await supabase.from('subscriptions').upsert(
        {
          user_id: userId,
          payment_intent_id: paymentIntentId,
          stripe_customer_id: paymentIntent.customer as string,
          stripe_charge_id: paymentIntent.latest_charge as string,
          payment_status: 'succeeded',
          status: 'active',
          currency,
          amount,
          plan: 'monthly',
          trial_end: null,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (paymentIntent.customer) {
        await supabase
          .from('user_profiles')
          .update({ stripe_customer_id: paymentIntent.customer as string })
          .eq('id', userId);
      }
    }

    return NextResponse.json({ success: true, status: paymentIntent.status });
  } catch (error: any) {
    console.error('confirm-payment API error:', error);
    return NextResponse.json({ error: error?.message ?? 'Confirmation failed' }, { status: 500 });
  }
}
