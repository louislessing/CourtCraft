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
    const { paymentIntentId, userId } = await req.json();

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded" && userId) {
      await supabase
        .from("mckenzie_sessions")
        .update({
          payment_status: "succeeded",
          stripe_charge_id: paymentIntent.latest_charge as string,
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
        })
        .eq("payment_intent_id", paymentIntentId);
    }

    return new Response(
      JSON.stringify({ success: true, status: paymentIntent.status }),
      {
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      }
    );
  } catch (error: any) {
    console.error("confirm-mckenzie-session error:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Confirmation failed" }),
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
