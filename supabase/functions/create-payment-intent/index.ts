import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const CURRENCY_AMOUNTS: Record<string, number> = {
  GBP: 35,
  USD: 32,
  CAD: 44,
  AUD: 49,
  NZD: 54,
  EUR: 30,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const { userId, email, fullName, currency = "GBP", stripeCustomerId } = await req.json();

    const amount = CURRENCY_AMOUNTS[currency] ?? 35;
    const currencyLower = currency.toLowerCase();

    // Create or update Stripe customer
    let customerId = stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: fullName,
        metadata: { userId: userId ?? "guest" },
      });
      customerId = customer.id;
    } else {
      await stripe.customers.update(customerId, { email, name: fullName });
    }

    // Create payment intent for subscription setup
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: currencyLower,
      customer: customerId,
      description: `CourtCraft Advocate — Monthly Subscription (${currency} ${amount}/month)`,
      setup_future_usage: "off_session",
      metadata: {
        userId: userId ?? "guest",
        currency,
      },
    });

    // Save subscription record as pending
    if (userId) {
      // Fetch registration date to compute the 7-day first-payment date
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("created_at")
        .eq("id", userId)
        .single();

      const registeredAt = profileData?.created_at
        ? new Date(profileData.created_at).getTime()
        : Date.now();

      // First payment = exactly 7 days after registration
      const firstPaymentDate = new Date(registeredAt + 7 * 24 * 60 * 60 * 1000);

      await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          stripe_customer_id: customerId,
          payment_intent_id: paymentIntent.id,
          status: "trialing",
          currency: currency,
          amount: amount,
          payment_status: "pending",
          trial_end: firstPaymentDate.toISOString(),
          current_period_end: firstPaymentDate.toISOString(),
        },
        { onConflict: "user_id" }
      );

      // Update user profile with stripe_customer_id
      await supabase
        .from("user_profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        customerId,
        amount,
        currency: currencyLower,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: any) {
    console.error("create-payment-intent error:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Payment setup failed" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
