/**
 * request-withdrawal Edge Function
 *
 * Called by a Pro user to withdraw their cleared earnings for a past calendar month.
 *
 * Rules:
 *   - Caller must be Pro
 *   - Requested period must be a past calendar month (not the current month)
 *   - No pending withdrawal request for the same period
 *   - Net earnings for the period must exceed minimum payout (R50)
 *   - Seller must have a registered bank account (paystack_recipient_code)
 *
 * Deploy:  supabase functions deploy request-withdrawal
 * Env vars needed:
 *   PAYSTACK_SECRET_KEY
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (auto-injected)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MIN_PAYOUT_ZAR = 50;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function paystackTransfer(
  amount: number,
  recipientCode: string,
  reason: string,
): Promise<string> {
  const res = await fetch("https://api.paystack.co/transfer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "balance",
      amount: Math.round(amount * 100), // kobo
      currency: "ZAR",
      recipient: recipientCode,
      reason,
    }),
  });
  const json = await res.json();
  if (!json.status) throw new Error(json.message ?? "Paystack transfer error");
  return (json.data as Record<string, unknown>).transfer_code as string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Authenticate
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

  // Verify Pro plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  if (profile?.plan !== "pro") {
    return new Response(JSON.stringify({ error: "Pro plan required" }), {
      status: 403,
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

  // period_month format: "YYYY-MM" e.g. "2026-05"
  const periodMonthStr = body.period_month as string | undefined;
  if (!periodMonthStr || !/^\d{4}-\d{2}$/.test(periodMonthStr)) {
    return new Response(JSON.stringify({ error: "period_month required (YYYY-MM)" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Enforce 30-day calendar month hold: period_month must be in the past
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (periodMonthStr >= currentMonthStr) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return new Response(
      JSON.stringify({
        error: `Funds for ${periodMonthStr} are not yet available. Earliest withdrawal date: ${nextMonth.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}.`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const periodStart = `${periodMonthStr}-01`;
    // Last day of the period month
    const [yr, mo] = periodMonthStr.split("-").map(Number);
    const lastDay = new Date(yr, mo, 0).getDate();
    const periodEnd = `${periodMonthStr}-${String(lastDay).padStart(2, "0")}`;

    // Check no existing pending/paid withdrawal for this period
    const { data: existing } = await supabase
      .from("withdrawal_requests")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("period_start", periodStart)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: `Withdrawal for ${periodMonthStr} already ${existing.status}.` }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }

    // Calculate net earnings for the period
    const { data: purchases, error: purchasesErr } = await supabase
      .from("mix_purchases")
      .select("seller_net_zar")
      .eq("seller_user_id", user.id)
      .eq("period_month", periodStart)
      .eq("status", "paid");

    if (purchasesErr) throw purchasesErr;

    const netEarnings = (purchases ?? []).reduce(
      (sum, p) => sum + Number(p.seller_net_zar),
      0,
    );

    if (netEarnings < MIN_PAYOUT_ZAR) {
      return new Response(
        JSON.stringify({
          error: `Earnings for ${periodMonthStr} (R${netEarnings.toFixed(2)}) are below the R${MIN_PAYOUT_ZAR} minimum payout.`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Get bank account / recipient code
    const { data: bankAccount } = await supabase
      .from("seller_bank_accounts")
      .select("paystack_recipient_code, bank_name, account_holder_name")
      .eq("user_id", user.id)
      .single();

    if (!bankAccount?.paystack_recipient_code) {
      return new Response(
        JSON.stringify({ error: "No bank account registered. Add your bank details in Settings first." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Initiate Paystack transfer
    const transferCode = await paystackTransfer(
      netEarnings,
      bankAccount.paystack_recipient_code,
      `Music Vault earnings payout — ${periodMonthStr}`,
    );

    // Record the withdrawal request
    await supabase.from("withdrawal_requests").insert({
      user_id: user.id,
      amount_zar: netEarnings,
      status: "pending",
      period_start: periodStart,
      period_end: periodEnd,
      paystack_transfer_code: transferCode,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        amount_zar: netEarnings,
        transfer_code: transferCode,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
