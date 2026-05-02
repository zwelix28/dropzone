import { Link } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import LivePage from "./LivePage.jsx";
import { useApp } from "../context/AppContext.jsx";
import { isProPlan, planLabel } from "../constants/plans.js";

function LockedShell({ title, children }) {
  return (
    <div
      className="fade-in"
      style={{
        padding: "32px 36px",
        paddingBottom: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        textAlign: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span className="live-badge" style={{ opacity: 0.6 }}>
          <span className="live-dot" />
          LIVE
        </span>
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 28, letterSpacing: "0.04em" }}>{title}</h1>
      </div>
      {children}
    </div>
  );
}

export default function LiveRoute() {
  const { auth } = useApp();

  if (auth.authLoading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--text2)", fontSize: 14 }}>Loading…</div>
    );
  }

  if (!auth.session?.user?.id) {
    return (
      <LockedShell title="Live Streams">
        <p style={{ color: "var(--text2)", marginBottom: 24, maxWidth: 420 }}>
          Sign in to browse live DJ sets and radio. Live streaming is included with a Pro plan.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => auth.setShowAuth(true)}>
          <Icon name="user" size={15} />
          Sign In / Register
        </button>
      </LockedShell>
    );
  }

  if (!isProPlan(auth.currentUser)) {
    const label = planLabel(auth.currentUser?.plan);
    return (
      <LockedShell title="Pro feature">
        <p style={{ color: "var(--text2)", marginBottom: 12, maxWidth: 440 }}>
          Your account is on the <strong style={{ color: "var(--text)" }}>{label}</strong> plan. Live streams are
          available on <strong style={{ color: "var(--green)" }}>Pro</strong> only.
        </p>
        <p style={{ color: "var(--text3)", fontSize: 13, marginBottom: 24, maxWidth: 440 }}>
          Upgrade options will appear here when billing is connected. Admins can set your plan from the admin
          dashboard for testing.
        </p>
        <Link to="/discover" className="btn btn-ghost" style={{ textDecoration: "none" }}>
          Back to Discover
        </Link>
      </LockedShell>
    );
  }

  return <LivePage />;
}
