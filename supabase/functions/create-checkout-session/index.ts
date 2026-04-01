// Deployed: 2026-03-23
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { userId, email, fullName, successUrl, cancelUrl } = await req.json();

    if (!userId || !email) {
      return new Response(JSON.stringify({ error: "userId and email are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("stripe_customer_id, created_at")
      .eq("id", userId)
      .single();

    // Always use auth.users.created_at as the authoritative account creation date
    // This ensures the 7-day trial is always counted from the actual signup date
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const accountCreatedAt = authUser?.user?.created_at || profile?.created_at || new Date().toISOString();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: fullName || email,
        metadata: { userId },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from("user_profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    } else {
      // Update customer details
      await stripe.customers.update(customerId, {
        email,
        name: fullName || email,
      });
    }

    // Calculate trial days remaining from registration date
    // First payment is taken exactly 7 days after registration
    let trialPeriodDays = 0;
    const registeredAt = new Date(accountCreatedAt).getTime();
    const firstPaymentAt = registeredAt + 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const msRemaining = firstPaymentAt - now;
    trialPeriodDays = msRemaining > 0 ? Math.ceil(msRemaining / (24 * 60 * 60 * 1000)) : 0;

    // Build subscription_data — include trial if days remain
    const subscriptionData: Record<string, unknown> = {
      metadata: {
        userId,
        plan: "monthly",
      },
    };
    if (trialPeriodDays > 0) {
      subscriptionData.trial_period_days = trialPeriodDays;
    }

    // Create Stripe Checkout Session for monthly subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "CourtCraft Advocate — Monthly Subscription",
              description: "Full access to all CourtCraft Advocate tools. Cancel anytime.",
            },
            unit_amount: 3500, // £35.00 in pence
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl || `${Deno.env.get("SITE_URL") || Deno.env.get("NEXT_PUBLIC_SITE_URL") || "https://courtcraftadvocate.com"}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${Deno.env.get("SITE_URL") || Deno.env.get("NEXT_PUBLIC_SITE_URL") || "https://courtcraftadvocate.com"}/subscription?canceled=true`,
      metadata: {
        userId,
        plan: "monthly",
      },
      subscription_data: subscriptionData,
      allow_promotion_codes: false,
      billing_address_collection: "auto",
    });

    // Update subscription record with pending checkout and correct trial_end
    const trialEnd = new Date(new Date(accountCreatedAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          stripe_customer_id: customerId,
          payment_status: "pending",
          status: "trialing",
          currency: "GBP",
          amount: 35,
          plan: "monthly",
          trial_end: trialEnd,
          current_period_end: trialEnd,
        },
        { onConflict: "user_id" }
      );

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      }
    );
  } catch (error: any) {
    console.error("create-checkout-session error:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Checkout session creation failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      }
    );
  }
});
