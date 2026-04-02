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

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';

const CURRENCY_AMOUNTS: Record<string, number> = {
  GBP: 35,
  USD: 32,
  CAD: 44,
  AUD: 49,
  NZD: 54,
  EUR: 30,
};

// ─── Helper: send email via Supabase send-email edge function ────────────────
async function sendEmail(payload: Record<string, unknown>) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('sendEmail error:', err);
  }
}

// ─── Helper: get user profile (email + full_name) ────────────────────────────
async function getUserProfile(userId: string) {
  const { data } = await supabase
    .from('user_profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single();
  return data;
}

// ─── Helper: upsert stripe_customers record ─────────────────────────────────
async function syncStripeCustomer(customer: Stripe.Customer | Stripe.DeletedCustomer) {
  if (customer.deleted) {
    await supabase
      .from('stripe_customers')
      .update({ deleted: true, updated_at: new Date().toISOString() })
      .eq('stripe_customer_id', customer.id);
    return;
  }

  const c = customer as Stripe.Customer;

  let userId: string | null = null;
  if (c.email) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', c.email)
      .single();
    userId = profile?.id ?? null;
  }

  await supabase.from('stripe_customers').upsert(
    {
      stripe_customer_id: c.id,
      user_id: userId,
      email: c.email ?? null,
      name: c.name ?? null,
      currency: c.currency ?? 'gbp',
      deleted: false,
      metadata: c.metadata ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_customer_id' }
  );

  if (userId) {
    await supabase
      .from('user_profiles')
      .update({ stripe_customer_id: c.id })
      .eq('id', userId);
  }
}

// ─── Helper: write a payment record ─────────────────────────────────────────
async function recordPayment(paymentIntent: Stripe.PaymentIntent, userId: string | null) {
  let resolvedUserId = userId;

  if (!resolvedUserId && paymentIntent.customer) {
    const { data: sc } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('stripe_customer_id', paymentIntent.customer as string)
      .single();
    resolvedUserId = sc?.user_id ?? null;
  }

  if (!resolvedUserId) return;

  await supabase.from('payments').upsert(
    {
      user_id: resolvedUserId,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_customer_id: (paymentIntent.customer as string) ?? null,
      stripe_status: paymentIntent.status,
      currency: paymentIntent.currency?.toUpperCase() ?? null,
      amount: paymentIntent.amount,
      metadata: paymentIntent.metadata ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_payment_intent_id' }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;

  try {
    if (WEBHOOK_SECRET && signature) {
      // Use constructEventAsync — required for Next.js App Router (async runtime)
      event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET);
    } else {
      console.warn('STRIPE_WEBHOOK_SECRET not set — accepting unsigned events (dev only)');
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {

      // ─── Customer sync ────────────────────────────────────────────────
      case 'customer.created': case'customer.updated': {
        const customer = event.data.object as Stripe.Customer;
        await syncStripeCustomer(customer);
        break;
      }

      case 'customer.deleted': {
        const customer = event.data.object as Stripe.DeletedCustomer;
        await syncStripeCustomer(customer);
        break;
      }

      // ─── Payment Intent flow ──────────────────────────────────────────
      case 'payment_intent.created': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await recordPayment(pi, pi.metadata?.userId ?? null);
        break;
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        let userId = pi.metadata?.userId ?? null;
        const currency = (pi.metadata?.currency || 'GBP').toUpperCase();
        const amount = CURRENCY_AMOUNTS[currency] ?? pi.amount / 100;

        await recordPayment(pi, userId);

        if (!userId) break;

        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            payment_status: 'succeeded',
            stripe_charge_id: pi.latest_charge as string,
            currency,
            amount,
            trial_end: null,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (pi.customer) {
          await supabase
            .from('user_profiles')
            .update({ stripe_customer_id: pi.customer as string })
            .eq('id', userId);
        }

        // Send payment confirmation email
        const profilePi = await getUserProfile(userId);
        if (profilePi?.email) {
          await sendEmail({
            type: 'payment_confirmation',
            to: profilePi.email,
            fullName: profilePi.full_name || profilePi.email,
            currency,
            amount,
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        let userId = pi.metadata?.userId ?? null;

        await recordPayment(pi, userId);

        if (!userId) break;

        await supabase
          .from('subscriptions')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
        break;
      }

      // ─── Checkout Session ─────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        let userId = session.metadata?.userId;
        const subscriptionId = session.subscription as string;

        if (!userId) break;

        let periodStart = new Date().toISOString();
        let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        let trialEnd: string | null = null;
        let subStatus = 'active';

        if (subscriptionId) {
          try {
            const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
            periodStart = new Date(stripeSub.current_period_start * 1000).toISOString();
            periodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();
            if (stripeSub.status === 'trialing' && stripeSub.trial_end) {
              subStatus = 'trialing';
              trialEnd = new Date(stripeSub.trial_end * 1000).toISOString();
              periodEnd = trialEnd;
            }
          } catch (_) { /* use defaults */ }
        }

        const sessionCurrency = (session.currency || 'gbp').toUpperCase();
        const sessionAmount = CURRENCY_AMOUNTS[sessionCurrency] ?? 35;

        await supabase.from('subscriptions').upsert(
          {
            user_id: userId,
            stripe_subscription_id: subscriptionId || null,
            stripe_customer_id: session.customer as string,
            status: subStatus,
            payment_status: subStatus === 'trialing' ? 'pending' : 'succeeded',
            currency: sessionCurrency,
            amount: sessionAmount,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            cancel_at_period_end: false,
            trial_end: trialEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        if (session.customer) {
          await supabase
            .from('user_profiles')
            .update({ stripe_customer_id: session.customer as string })
            .eq('id', userId);

          try {
            const stripeCustomer = await stripe.customers.retrieve(session.customer as string);
            await syncStripeCustomer(stripeCustomer);
          } catch (_) { /* non-critical */ }
        }

        // Send payment confirmation email
        const profileCheckout = await getUserProfile(userId);
        if (profileCheckout?.email) {
          await sendEmail({
            type: 'payment_confirmation',
            to: profileCheckout.email,
            fullName: profileCheckout.full_name || profileCheckout.email,
            currency: sessionCurrency,
            amount: sessionAmount,
          });
        }
        break;
      }

      // ─── Invoice events ───────────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (!sub?.user_id) break;

        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);

        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            payment_status: 'succeeded',
            current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: stripeSub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);

        if (invoice.payment_intent) {
          try {
            const pi = await stripe.paymentIntents.retrieve(invoice.payment_intent as string);
            await recordPayment(pi, sub.user_id);
          } catch (_) { /* non-critical */ }
        }

        // Send invoice confirmation email for renewal billing cycles
        if (invoice.billing_reason === 'subscription_cycle' || invoice.billing_reason === 'subscription_update') {
          const profileInv = await getUserProfile(sub.user_id);
          if (profileInv?.email) {
            const invCurrency = (invoice.currency || 'gbp').toUpperCase();
            const invAmount = CURRENCY_AMOUNTS[invCurrency] ?? (invoice.amount_paid ? invoice.amount_paid / 100 : 35);
            const pStart = new Date(stripeSub.current_period_start * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            const pEnd = new Date(stripeSub.current_period_end * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            await sendEmail({
              type: 'invoice_confirmation',
              to: profileInv.email,
              fullName: profileInv.full_name || profileInv.email,
              currency: invCurrency,
              amount: invAmount,
              periodStart: pStart,
              periodEnd: pEnd,
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        await supabase
          .from('subscriptions')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);

        const { data: subRecord } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (subRecord?.user_id && invoice.payment_intent) {
          try {
            const pi = await stripe.paymentIntents.retrieve(invoice.payment_intent as string);
            await recordPayment(pi, subRecord.user_id);
          } catch (_) { /* non-critical */ }
        }

        // Send payment failed email
        if (subRecord?.user_id) {
          const profileFailed = await getUserProfile(subRecord.user_id);
          if (profileFailed?.email) {
            await sendEmail({
              type: 'payment_failed',
              to: profileFailed.email,
              fullName: profileFailed.full_name || profileFailed.email,
              failureReason: invoice.last_finalization_error?.message || 'Your subscription payment was declined',
            });
          }
        }
        break;
      }

      // ─── Subscription lifecycle ───────────────────────────────────────
      case 'customer.subscription.updated': {
        const stripeSub = event.data.object as Stripe.Subscription;
        let userId = stripeSub.metadata?.userId;
        if (!userId) break;

        let status = 'active';
        if (stripeSub.status === 'canceled') status = 'canceled';
        else if (stripeSub.status === 'past_due') status = 'past_due';
        else if (stripeSub.cancel_at_period_end) status = 'canceling';

        await supabase
          .from('subscriptions')
          .update({
            status,
            stripe_subscription_id: stripeSub.id,
            current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: stripeSub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        // Send subscription status update email
        const profileSubUpdated = await getUserProfile(userId);
        if (profileSubUpdated?.email) {
          const pEnd = new Date(stripeSub.current_period_end * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
          await sendEmail({
            type: 'subscription_updated',
            to: profileSubUpdated.email,
            fullName: profileSubUpdated.full_name || profileSubUpdated.email,
            newStatus: status,
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
            periodEnd: pEnd,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as Stripe.Subscription;
        let userId = stripeSub.metadata?.userId;
        if (!userId) break;

        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        // Send subscription cancelled email
        const profileCanceled = await getUserProfile(userId);
        if (profileCanceled?.email) {
          await sendEmail({
            type: 'subscription_canceled',
            to: profileCanceled.email,
            fullName: profileCanceled.full_name || profileCanceled.email,
          });
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Stripe webhook handler error:', error);
    return NextResponse.json(
      { error: error?.message ?? 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
