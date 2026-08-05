import { useCallback, useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, "")}/functions/v1`
  : null;

/**
 * BuyButton — shown on MixDetailPage when a mix is for sale.
 *
 * Props:
 *   episode   — the mix object (must have id, priceZar, isForSale)
 *   session   — Supabase session (null = guest)
 *   onSignIn  — callback to open the auth modal
 *   compact   — layout hint
 *   onUnlocked — called when a purchase is confirmed so the parent can show the download CTA
 */
export default function BuyButton({ episode, session, onSignIn, compact = false, onUnlocked }) {
  const [purchased, setPurchased] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [justPurchased, setJustPurchased] = useState(false);

  const userId = session?.user?.id;

  // Check if already purchased
  const checkPurchase = useCallback(async () => {
    if (!userId || !isSupabaseConfigured()) { setChecking(false); return; }
    const { data } = await supabase
      .from("mix_purchases")
      .select("id")
      .eq("buyer_user_id", userId)
      .eq("mix_id", episode.id)
      .eq("status", "paid")
      .maybeSingle();
    setPurchased(!!data);
    setChecking(false);
    if (data) onUnlocked?.();
  }, [userId, episode.id, onUnlocked]);

  useEffect(() => { void checkPurchase(); }, [checkPurchase]);

  // Handle return from Paystack with ?purchase=success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("purchase") === "success") {
      setJustPurchased(true);
      // Re-check DB in case webhook hasn't fired yet; retry a few times
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts += 1;
        if (!userId || !isSupabaseConfigured()) { clearInterval(poll); return; }
        const { data } = await supabase
          .from("mix_purchases")
          .select("id")
          .eq("buyer_user_id", userId)
          .eq("mix_id", episode.id)
          .eq("status", "paid")
          .maybeSingle();
        if (data) {
          setPurchased(true);
          onUnlocked?.();
          clearInterval(poll);
        }
        if (attempts >= 8) clearInterval(poll);
      }, 3000);
    }
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBuy = async () => {
    if (!session) { onSignIn?.(); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ type: "mix_purchase", mix_id: episode.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Checkout failed");
      window.location.href = json.authorization_url;
    } catch (e) {
      setError(e?.message ?? "Something went wrong");
      setBusy(false);
    }
  };

  if (!episode.isForSale || !episode.priceZar) return null;
  if (checking) return null;

  if (purchased || justPurchased) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: compact ? "8px 12px" : "10px 16px",
          background: "rgba(34,197,94,0.12)",
          border: "1px solid var(--green)",
          borderRadius: 10,
          fontSize: compact ? 12 : 13,
          color: "var(--green)",
          fontWeight: 600,
        }}
      >
        <Icon name="download" size={14} color="var(--green)" />
        {justPurchased && !purchased ? "Confirming payment…" : "Purchased — download unlocked"}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        className="btn btn-primary"
        disabled={busy}
        onClick={() => void handleBuy()}
        style={{
          background: "var(--green)",
          minWidth: 0,
          width: compact ? "100%" : undefined,
          boxSizing: "border-box",
          padding: compact ? "8px 10px" : undefined,
          fontSize: compact ? 12 : undefined,
          justifyContent: "center",
        }}
      >
        <Icon name="zap" size={compact ? 13 : 15} />
        {busy ? "Redirecting…" : `Buy — R${Number(episode.priceZar).toFixed(2)}`}
      </button>
      {error ? <p style={{ fontSize: 11, color: "var(--red)", margin: 0 }}>{error}</p> : null}
    </div>
  );
}
