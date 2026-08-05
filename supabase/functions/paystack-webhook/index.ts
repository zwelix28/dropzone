/**
 * Paystack Webhook Edge Function
 *
 * Handles:
 *   charge.success  → mix purchase OR Pro subscription payment
 *   subscription.create  → mark profile.plan = 'pro'
 *   subscription.disable → downgrade profile.plan = 'free'
 *
 * Deploy:  supabase functions deploy paystack-webhook --no-verify-jwt
 * Env vars needed:
 *   PAYSTACK_SECRET_KEY     — your Paystack secret key
 *   SUPABASE_URL            — injected automatically by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — injected automatically by Supabase
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

const PLATFORM_FEE_PERCENT = 0.20; // 20% platform cut

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function verifySignature(req: Request, body: string): Promise<boolean> {
  const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!paystackKey) return false;
  const sig = req.headers.get("x-paystack-signature") ?? "";
  const expected = hmac("sha512", paystackKey, body, "utf8", "hex") as string;
  return sig === expected;
}

async function handleChargSuccess(data: Record<string, unknown>) {
  const meta = (data.metadata ?? {}) as Record<string, unknown>;
  const kind = meta.kind as string | undefined;

  // ── Pro subscription payment ──
  if (kind === "pro_subscription") {
    const userId = meta.user_id as string | undefined;
    if (!userId) return;
    await supabase.from("profiles").update({ plan: "pro" }).eq("id", userId);

    // Store customer code for future subscription management
    const customerCode = (data.customer as Record<string, unknown>)?.customer_code as string | undefined;
    if (customerCode) {
      await supabase.from("profiles").update({ paystack_customer_code: customerCode }).eq("id", userId);
    }
    return;
  }

  // ── Mix purchase ──
  if (kind === "mix_purchase") {
    const mixId = meta.mix_id as string | undefined;
    const buyerUserId = meta.buyer_user_id as string | undefined;
    const paystackRef = data.reference as string | undefined;

    if (!mixId || !buyerUserId || !paystackRef) return;

    // Fetch the mix to get seller + price
    const { data: mix, error: mixErr } = await supabase
      .from("mixes")
      .select("id, user_id, price_zar, title")
      .eq("id", mixId)
      .single();

    if (mixErr || !mix) return;

    const priceZar = Number(mix.price_zar);
    const platformFee = Math.round(priceZar * PLATFORM_FEE_PERCENT * 100) / 100;
    const sellerNet = Math.round((priceZar - platformFee) * 100) / 100;

    // Insert purchase record (upsert to handle duplicate webhooks)
    const { error: purchaseErr } = await supabase.from("mix_purchases").upsert(
      {
        buyer_user_id: buyerUserId,
        seller_user_id: mix.user_id,
        mix_id: mixId,
        amount_zar: priceZar,
        platform_fee_zar: platformFee,
        seller_net_zar: sellerNet,
        paystack_reference: paystackRef,
        status: "paid",
        period_month: new Date().toISOString().slice(0, 7) + "-01",
      },
      { onConflict: "buyer_user_id,mix_id", ignoreDuplicates: false },
    );

    if (purchaseErr) {
      console.error("mix_purchases upsert:", purchaseErr.message);
      return;
    }

    // Increment sales_count on the mix
    await supabase.rpc("increment_mix_sales_count", { p_mix_id: mixId });

    // Notify the seller
    const buyerProfile = await supabase
      .from("profiles")
      .select("username")
      .eq("id", buyerUserId)
      .single();
    const buyerName = buyerProfile.data?.username ?? "Someone";

    await supabase.from("notifications").insert({
      user_id: mix.user_id,
      type: "sale",
      title: "New sale!",
      message: `${buyerName} purchased "${(mix.title as string).slice(0, 60)}" for R${priceZar.toFixed(2)}.`,
      href: `/mix/${mixId}`,
      episode_id: mixId,
      meta: { kind: "sale", buyer_id: buyerUserId, amount_zar: priceZar },
    });
  }
}

async function handleSubscriptionCreate(data: Record<string, unknown>) {
  const customerCode = (data.customer as Record<string, unknown>)?.customer_code as string | undefined;
  if (!customerCode) return;
  const subscriptionCode = data.subscription_code as string | undefined;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("paystack_customer_code", customerCode)
    .single();

  if (!profile) return;

  await supabase.from("profiles").update({
    plan: "pro",
    paystack_subscription_code: subscriptionCode ?? null,
  }).eq("id", profile.id);
}

async function handleSubscriptionDisable(data: Record<string, unknown>) {
  const customerCode = (data.customer as Record<string, unknown>)?.customer_code as string | undefined;
  if (!customerCode) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("paystack_customer_code", customerCode)
    .single();

  if (!profile) return;
  await supabase.from("profiles").update({ plan: "free" }).eq("id", profile.id);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.text();

  const isValid = await verifySignature(req, body);
  if (!isValid) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: { event: string; data: Record<string, unknown> };
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const { event, data } = payload;

  try {
    if (event === "charge.success") {
      await handleChargSuccess(data);
    } else if (event === "subscription.create") {
      await handleSubscriptionCreate(data);
    } else if (event === "subscription.disable" || event === "subscription.not_renew") {
      await handleSubscriptionDisable(data);
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event}:`, err);
  }

  // Always return 200 so Paystack doesn't retry unnecessarily
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
