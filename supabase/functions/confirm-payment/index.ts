// Deployed: 2026-03-23
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
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
    const { paymentIntentId, userId } = await req.json();

    if (!paymentIntentId) {
      return new Response(
        JSON.stringify({ error: "paymentIntentId is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded" && userId) {
      const currency = (paymentIntent.metadata?.currency || "GBP").toUpperCase();
      const amount = CURRENCY_AMOUNTS[currency] ?? paymentIntent.amount / 100;
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Always upsert — creates the row if missing, updates if it exists
      const { error: upsertError } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            payment_intent_id: paymentIntentId,
            stripe_customer_id: paymentIntent.customer as string,
            stripe_charge_id: paymentIntent.latest_charge as string,
            payment_status: "succeeded",
            status: "active",
            currency,
            amount,
            plan: "monthly",
            trial_end: null,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            updated_at: now.toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (upsertError) {
        console.error("Subscription upsert error:", upsertError.message);
      }

      // Update user profile with stripe_customer_id
      if (paymentIntent.customer) {
        await supabase
          .from("user_profiles")
          .update({ stripe_customer_id: paymentIntent.customer as string })
          .eq("id", userId);
      }
    }

    return new Response(
      JSON.stringify({ success: true, status: paymentIntent.status }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: any) {
    console.error("confirm-payment error:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Confirmation failed" }),
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
