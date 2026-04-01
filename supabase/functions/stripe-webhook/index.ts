// Deployed: 2026-03-31
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

const CURRENCY_AMOUNTS: Record<string, number> = {
  GBP: 35,
  USD: 32,
  CAD: 44,
  AUD: 49,
  NZD: 54,
  EUR: 30,
};

// ─── Helper: upsert stripe_customers record ────────────────────────────────
async function syncStripeCustomer(customer: Stripe.Customer | Stripe.DeletedCustomer) {
  if (customer.deleted) {
    await supabase
      .from("stripe_customers")
      .update({ deleted: true, updated_at: new Date().toISOString() })
      .eq("stripe_customer_id", customer.id);
    return;
  }

  const c = customer as Stripe.Customer;

  // Try to find matching user by email
  let userId: string | null = null;
  if (c.email) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", c.email)
      .single();
    userId = profile?.id ?? null;
  }

  await supabase.from("stripe_customers").upsert(
    {
      stripe_customer_id: c.id,
      user_id: userId,
      email: c.email ?? null,
      name: c.name ?? null,
      currency: c.currency ?? "gbp",
      deleted: false,
      metadata: c.metadata ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_customer_id" }
  );

  // Also keep user_profiles.stripe_customer_id in sync
  if (userId) {
    await supabase
      .from("user_profiles")
      .update({ stripe_customer_id: c.id })
      .eq("id", userId);
  }
}

// ─── Helper: write a payment record ────────────────────────────────────────
async function recordPayment(
  paymentIntent: Stripe.PaymentIntent,
  userId: string | null
) {
  if (!userId) {
    // Try to resolve user from customer
    if (paymentIntent.customer) {
      const { data: sc } = await supabase
        .from("stripe_customers")
        .select("user_id")
        .eq("stripe_customer_id", paymentIntent.customer as string)
        .single();
      userId = sc?.user_id ?? null;
    }
  }

  if (!userId) return;

  await supabase.from("payments").upsert(
    {
      user_id: userId,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_customer_id: (paymentIntent.customer as string) ?? null,
      stripe_status: paymentIntent.status,
      currency: paymentIntent.currency?.toUpperCase() ?? null,
      amount: paymentIntent.amount,
      metadata: paymentIntent.metadata ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_payment_intent_id" }
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;

  try {
    if (WEBHOOK_SECRET) {
      if (!signature) {
        console.error("Missing stripe-signature header");
        return new Response(JSON.stringify({ error: "Missing signature" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET);
    } else {
      console.warn("STRIPE_WEBHOOK_SECRET not set — accepting unsigned events (dev only)");
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  try {
    switch (event.type) {

      // ─── Customer sync ──────────────────────────────────────────────────
      case "customer.created": case"customer.updated": {
        const customer = event.data.object as Stripe.Customer;
        await syncStripeCustomer(customer);
        break;
      }

      case "customer.deleted": {
        const customer = event.data.object as Stripe.DeletedCustomer;
        await syncStripeCustomer(customer);
        break;
      }

      // ─── Payment Intent flow ────────────────────────────────────────────
      case "payment_intent.created": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        let userId = paymentIntent.metadata?.userId ?? null;
        await recordPayment(paymentIntent, userId);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        let userId = paymentIntent.metadata?.userId;
        const currency = (paymentIntent.metadata?.currency || "GBP").toUpperCase();
        const amount = CURRENCY_AMOUNTS[currency] ?? paymentIntent.amount / 100;

        // Record payment
        await recordPayment(paymentIntent, userId ?? null);

        if (!userId) break;

        // Update subscription record to active
        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            payment_status: "succeeded",
            stripe_charge_id: paymentIntent.latest_charge as string,
            currency,
            amount,
            plan: "monthly",
            trial_end: null,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        // Update user profile with stripe_customer_id
        if (paymentIntent.customer) {
          await supabase
            .from("user_profiles")
            .update({ stripe_customer_id: paymentIntent.customer as string })
            .eq("id", userId);
        }

        // Send payment confirmation email
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (profile?.email) {
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              type: "payment_confirmation",
              to: profile.email,
              fullName: profile.full_name || profile.email,
              currency,
              amount,
            }),
          });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        let userId = paymentIntent.metadata?.userId;

        // Record failed payment
        await recordPayment(paymentIntent, userId ?? null);

        if (!userId) break;

        await supabase
          .from("subscriptions")
          .update({
            payment_status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        const { data: profileFailed } = await supabase
          .from("user_profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (profileFailed?.email) {
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              type: "payment_failed",
              to: profileFailed.email,
              fullName: profileFailed.full_name || profileFailed.email,
              failureReason: paymentIntent.last_payment_error?.message || "Your payment was declined",
            }),
          });
        }
        break;
      }

      // ─── Checkout Session flow ──────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        let userId = session.metadata?.userId;
        const subscriptionId = session.subscription as string;

        if (!userId) break;

        let periodStart = new Date().toISOString();
        let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        let trialEnd: string | null = null;
        let subStatus: string = "active";

        if (subscriptionId) {
          try {
            const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
            periodStart = new Date(stripeSub.current_period_start * 1000).toISOString();
            periodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();
            if (stripeSub.status === "trialing" && stripeSub.trial_end) {
              subStatus = "trialing";
              trialEnd = new Date(stripeSub.trial_end * 1000).toISOString();
              periodEnd = trialEnd;
            }
          } catch (_) { /* use defaults */ }
        }

        const sessionCurrency = (session.currency || "gbp").toUpperCase();
        const sessionAmount = CURRENCY_AMOUNTS[sessionCurrency] ?? 35;

        await supabase
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              stripe_subscription_id: subscriptionId || null,
              stripe_customer_id: session.customer as string,
              status: subStatus,
              payment_status: subStatus === "trialing" ? "pending" : "succeeded",
              currency: sessionCurrency,
              amount: sessionAmount,
              plan: "monthly",
              current_period_start: periodStart,
              current_period_end: periodEnd,
              cancel_at_period_end: false,
              trial_end: trialEnd,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (session.customer) {
          await supabase
            .from("user_profiles")
            .update({ stripe_customer_id: session.customer as string })
            .eq("id", userId);

          // Sync customer record
          try {
            const stripeCustomer = await stripe.customers.retrieve(session.customer as string);
            await syncStripeCustomer(stripeCustomer);
          } catch (_) { /* non-critical */ }
        }

        // Send payment confirmation email
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (profile?.email) {
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              type: "payment_confirmation",
              to: profile.email,
              fullName: profile.full_name || profile.email,
              currency: sessionCurrency,
              amount: sessionAmount,
            }),
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

        if (!sub?.user_id) break;

        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);

        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            payment_status: "succeeded",
            current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: stripeSub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);

        // Record the invoice payment if there's a payment intent
        if (invoice.payment_intent) {
          try {
            const pi = await stripe.paymentIntents.retrieve(invoice.payment_intent as string);
            await recordPayment(pi, sub.user_id);
          } catch (_) { /* non-critical */ }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        await supabase
          .from("subscriptions")
          .update({
            payment_status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);

        const { data: subRecord } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

        if (subRecord?.user_id) {
          // Record the failed payment
          if (invoice.payment_intent) {
            try {
              const pi = await stripe.paymentIntents.retrieve(invoice.payment_intent as string);
              await recordPayment(pi, subRecord.user_id);
            } catch (_) { /* non-critical */ }
          }

          const { data: profileInv } = await supabase
            .from("user_profiles")
            .select("email, full_name")
            .eq("id", subRecord.user_id)
            .single();

          if (profileInv?.email) {
            await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                type: "payment_failed",
                to: profileInv.email,
                fullName: profileInv.full_name || profileInv.email,
                failureReason: invoice.last_finalization_error?.message || "Your subscription payment was declined",
              }),
            });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const stripeSub = event.data.object as Stripe.Subscription;
        let userId = stripeSub.metadata?.userId;
        if (!userId) break;

        let status = "active";
        if (stripeSub.status === "canceled") status = "canceled";
        else if (stripeSub.status === "past_due") status = "past_due";
        else if (stripeSub.cancel_at_period_end) status = "canceling";

        await supabase
          .from("subscriptions")
          .update({
            status,
            stripe_subscription_id: stripeSub.id,
            current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: stripeSub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        let userId = stripeSub.metadata?.userId;
        if (!userId) break;

        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook handler error:", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Webhook processing failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
