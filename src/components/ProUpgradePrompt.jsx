import Icon from "./Icon.jsx";

/**
 * Reusable locked-feature banner shown to non-Pro users.
 * Pass onUpgrade to wire in the checkout redirect.
 */
export default function ProUpgradePrompt({
  title = "Pro feature",
  description = "Upgrade to Pro to unlock this feature.",
  onUpgrade,
  loading = false,
  compact = false,
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: compact ? 12 : 14,
        padding: compact ? "16px 14px" : "24px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.08em",
            color: "#fff",
            background: "rgb(22, 163, 74)",
            padding: "3px 8px",
            borderRadius: 6,
          }}
        >
          PRO
        </span>
        <span style={{ fontWeight: 700, fontSize: compact ? 14 : 16 }}>{title}</span>
      </div>
      <p style={{ margin: 0, color: "var(--text2)", fontSize: compact ? 13 : 14, lineHeight: 1.6 }}>
        {description}
      </p>
      {onUpgrade ? (
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading}
          onClick={onUpgrade}
          style={{ alignSelf: compact ? "stretch" : "flex-start", justifyContent: "center" }}
        >
          <Icon name="zap" size={14} />
          {loading ? "Redirecting to Paystack…" : "Upgrade to Pro"}
        </button>
      ) : null}
    </div>
  );
}
