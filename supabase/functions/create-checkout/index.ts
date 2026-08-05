/**
 * create-checkout Edge Function
 *
 * Two modes, selected by `type` in the request body:
 *   "mix_purchase"    — one-time Paystack transaction for buying a mix
 *   "pro_subscription" — Paystack transaction linked to a monthly Plan (PLN_xxx)
 *
 * Returns: { authorization_url }  — redirect the user there
 *
 * Deploy:  supabase functions deploy create-checkout
 * Env vars needed:
 *   PAYSTACK_SECRET_KEY
 *   PUBLIC_SITE_URL     — e.g. https://musicvault.netlify.app
 *   PAYSTACK_PRO_PLAN_CODE — e.g. PLN_xxxxxxx (create in Paystack dashboard)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const PAYSTACK_BASE = "https://api.paystack.co";
const PAYSTACK_KEY = () => Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
const SITE_URL = () => (Deno.env.get("PUBLIC_SITE_URL") ?? "").replace(/\/$/, "");
const PRO_PLAN_CODE = () => Deno.env.get("PAYSTACK_PRO_PLAN_CODE") ?? "";

async function paystackPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_KEY()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.status) throw new Error(json.message ?? "Paystack error");
  return json.data as Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verify the caller is signed in via Supabase JWT
  const authHeader = req.headers.get("Authorization") ?? "";
  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const type = body.type as string | undefined;

  try {
    if (type === "mix_purchase") {
      const mixId = body.mix_id as string | undefined;
      if (!mixId) throw new Error("mix_id required");

      // Fetch mix
      const { data: mix, error: mixErr } = await supabase
        .from("mixes")
        .select("id, title, price_zar, is_for_sale, user_id")
        .eq("id", mixId)
        .single();

      if (mixErr || !mix) throw new Error("Mix not found");
      if (!mix.is_for_sale || !mix.price_zar) throw new Error("Mix is not for sale");
      if (mix.user_id === user.id) throw new Error("You cannot buy your own mix");

      // Check not already purchased
      const { data: existing } = await supabase
        .from("mix_purchases")
        .select("id")
        .eq("buyer_user_id", user.id)
        .eq("mix_id", mixId)
        .maybeSingle();
      if (existing) throw new Error("Already purchased");

      const amountKobo = Math.round(Number(mix.price_zar) * 100);

      const txData = await paystackPost("/transaction/initialize", {
        email: user.email,
        amount: amountKobo,
        currency: "ZAR",
        callback_url: `${SITE_URL()}/mix/${mixId}?purchase=success`,
        metadata: {
          kind: "mix_purchase",
          mix_id: mixId,
          buyer_user_id: user.id,
        },
      });

      return new Response(
        JSON.stringify({ authorization_url: txData.authorization_url }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (type === "pro_subscription") {
      const planCode = PRO_PLAN_CODE();
      if (!planCode) throw new Error("PAYSTACK_PRO_PLAN_CODE not configured");

      // Store customer code on first sub
      const txData = await paystackPost("/transaction/initialize", {
        email: user.email,
        amount: 0, // Paystack uses the plan amount; amount must still be present
        plan: planCode,
        currency: "ZAR",
        callback_url: `${SITE_URL()}/settings?subscription=success`,
        metadata: {
          kind: "pro_subscription",
          user_id: user.id,
        },
      });

      return new Response(
        JSON.stringify({ authorization_url: txData.authorization_url }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    throw new Error(`Unknown checkout type: ${type}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
