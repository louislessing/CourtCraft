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
    const { userId, email, fullName } = await req.json();

    const customerName = fullName || "Guest";
    const customerEmail = email || "guest@courtcraft.app";

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: customerEmail,
      name: customerName,
      metadata: { userId: userId ?? "guest", type: "mckenzie_session" },
    });

    // Create payment intent for £50 session
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 5000, // £50 in pence
      currency: "gbp",
      customer: customer.id,
      payment_method_types: ["card"],
      description: "CourtCraft Advocate — 1-on-1 McKenzie Friend Session (£50/hour)",
      metadata: {
        userId: userId ?? "guest",
        type: "mckenzie_session",
        amount: "50",
        currency: "GBP",
      },
    });

    // Save session booking record if user is authenticated
    if (userId) {
      await supabase.from("mckenzie_sessions").insert({
        user_id: userId,
        stripe_customer_id: customer.id,
        payment_intent_id: paymentIntent.id,
        amount: 50,
        currency: "GBP",
        payment_status: "pending",
        status: "pending_payment",
      }).select().single();
    }

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        customerId: customer.id,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      }
    );
  } catch (error: any) {
    console.error("create-mckenzie-session-intent error:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Payment setup failed" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      }
    );
  }
});
