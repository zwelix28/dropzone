import { Link, NavLink } from "react-router-dom";
import { FEATURE_DISCOVER, FEATURE_LETS_DJ, FEATURE_LIVE, FEATURE_STATS, FEATURE_TOP10, FEATURE_VAULT_FEED, signedInHomePath } from "../featureFlags.js";
import Icon from "./Icon.jsx";
import UserAvatar from "./UserAvatar.jsx";

function NavBtn({ to, icon, label, onClose, compact = false }) {
  const iconSize = compact ? 16 : 20;
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
      onClick={() => onClose?.()}
    >
      <Icon name={icon} size={iconSize} />
      {label}
    </NavLink>
  );
}

function LiveNavBtn({ onClose, compact = false }) {
  const iconSize = compact ? 16 : 20;
  return (
    <NavLink
      to="/live"
      className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: compact ? 6 : 8 }}
      onClick={() => onClose?.()}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: compact ? 6 : 8 }}>
        <Icon name="radio" size={iconSize} />
        Live
      </span>
      <span
        title="Pro plan"
        style={{
          fontSize: compact ? 9 : 11,
          fontWeight: 800,
          letterSpacing: "0.08em",
          color: "#fff",
          background: "rgb(22, 163, 74)",
          padding: "2px 6px",
          borderRadius: 4,
          lineHeight: 1.2,
          flexShrink: 0,
        }}
      >
        PRO
      </span>
    </NavLink>
  );
}

/**
 * @param {{ currentUser: any, onLogout: () => void, onLogin: () => void, variant?: 'desktop' | 'drawer', onClose?: () => void, dmUnreadCount?: number }} props
 */
export const DESKTOP_SIDEBAR_WIDTH = 264;

export default function Sidebar({ currentUser, onLogout, onLogin, variant = "desktop", onClose, dmUnreadCount = 0 }) {
  const isDrawer = variant === "drawer";

  return (
    <aside
      className={isDrawer ? "sidebar-drawer" : "sidebar-desktop"}
      style={{
        width: isDrawer ? "100%" : DESKTOP_SIDEBAR_WIDTH,
        height: "auto",
        maxHeight: isDrawer ? "100%" : "calc(100dvh - 16px)",
        background: "var(--bg2)",
        borderRight: isDrawer ? "none" : "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        borderRadius: isDrawer ? "0 0 22px 22px" : "0 0 22px 0",
        padding: isDrawer ? "0 11px 14px" : "0 14px 16px",
        position: isDrawer ? "relative" : "fixed",
        top: isDrawer ? "auto" : 0,
        left: isDrawer ? "auto" : 0,
        zIndex: isDrawer ? "auto" : 250,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        boxShadow: isDrawer
          ? "0 18px 40px rgba(0,0,0,0.35)"
          : "8px 16px 36px rgba(0,0,0,0.28)",
      }}
    >
      {isDrawer ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "11px 3px 10px",
            borderBottom: "1px solid var(--border)",
            marginBottom: 10,
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 800, fontSize: 14, color: "var(--text2)", letterSpacing: "0.06em" }}>
            Menu
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            aria-label="Close menu"
            onClick={() => onClose?.()}
            style={{ padding: "6px 8px", minWidth: 32, justifyContent: "center" }}
          >
            <Icon name="x" size={19} color="var(--text2)" />
          </button>
        </div>
      ) : null}

      <div
        style={{
          padding: isDrawer ? "0 6px 13px" : "22px 8px 20px",
          borderBottom: isDrawer ? "none" : "1px solid var(--border)",
          marginBottom: isDrawer ? 6 : 16,
          flexShrink: 0,
        }}
      >
        <Link
          to={currentUser ? signedInHomePath() : "/"}
          style={{ textDecoration: "none", color: "inherit" }}
          onClick={() => onClose?.()}
        >
          <div style={{ display: "flex", alignItems: "center", gap: isDrawer ? 8 : 10 }}>
            <img
              src="/logo.png"
              alt="Music Vault"
              width={isDrawer ? 34 : 43}
              height={isDrawer ? 34 : 43}
              style={{
                width: isDrawer ? 34 : 43,
                height: isDrawer ? 34 : 43,
                borderRadius: isDrawer ? 8 : 10,
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div
                style={{
                  fontFamily: "var(--ff-display)",
                  fontSize: isDrawer ? 21 : 26,
                  letterSpacing: "0.05em",
                  lineHeight: 1,
                }}
              >
                Music Vault
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div className="sidebar-nav-body">
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              fontSize: isDrawer ? 10 : 12,
              fontWeight: 700,
              color: "var(--text3)",
              letterSpacing: "0.12em",
              padding: "0 8px",
              marginBottom: isDrawer ? 5 : 6,
            }}
          >
            MAIN
          </div>
          {!currentUser ? <NavBtn compact={isDrawer} to="/" icon="home" label="Home" onClose={onClose} /> : null}
          <NavBtn compact={isDrawer} to="/foryou" icon="zap" label="For You" onClose={onClose} />
          {currentUser && FEATURE_VAULT_FEED ? (
            <NavBtn compact={isDrawer} to="/vault-feed" icon="list" label="Vault Feed" onClose={onClose} />
          ) : null}
          {currentUser && FEATURE_DISCOVER ? (
            <NavBtn compact={isDrawer} to="/discover" icon="compass" label="Discover" onClose={onClose} />
          ) : null}
          {currentUser ? <NavBtn compact={isDrawer} to="/mixes" icon="music" label="Mixes" onClose={onClose} /> : null}
          {currentUser ? <NavBtn compact={isDrawer} to="/library" icon="library" label="Library" onClose={onClose} /> : null}
          {currentUser ? <NavBtn compact={isDrawer} to="/submit-mix" icon="send" label="Submit Mix" onClose={onClose} /> : null}
          {FEATURE_LIVE ? <LiveNavBtn compact={isDrawer} onClose={onClose} /> : null}
          {FEATURE_TOP10 ? <NavBtn compact={isDrawer} to="/top10" icon="trending" label="Top 10" onClose={onClose} /> : null}
          {currentUser?.isAdmin ? <NavBtn compact={isDrawer} to="/upload" icon="upload" label="Upload" onClose={onClose} /> : null}
          {FEATURE_LETS_DJ ? <NavBtn compact={isDrawer} to="/dj" icon="disc" label={"Let's DJ"} onClose={onClose} /> : null}
        </div>

        {currentUser && (
          <div style={{ marginTop: isDrawer ? 13 : 16 }}>
            <div
              style={{
                fontSize: isDrawer ? 10 : 12,
                fontWeight: 700,
                color: "var(--text3)",
                letterSpacing: "0.12em",
                padding: "0 8px",
                marginBottom: isDrawer ? 5 : 6,
              }}
            >
              ACCOUNT
            </div>
            {FEATURE_STATS ? <NavBtn compact={isDrawer} to="/stats" icon="bar2" label="My Stats" onClose={onClose} /> : null}
            <NavBtn compact={isDrawer} to="/likes" icon="heart" label="Likes" onClose={onClose} />
            <NavBtn compact={isDrawer} to="/community" icon="community" label="Community" onClose={onClose} />
            <NavBtn compact={isDrawer} to="/profile" icon="user" label="My Profile" onClose={onClose} />
            <NavBtn compact={isDrawer} to="/connections" icon="people" label="Connections" onClose={onClose} />
            <NavBtn compact={isDrawer} to="/settings" icon="settings" label="Settings" onClose={onClose} />
            {currentUser?.isAdmin ? <NavBtn compact={isDrawer} to="/admin" icon="shield" label="Admin Panel" onClose={onClose} /> : null}
          </div>
        )}

        <div className="sidebar-account-footer" style={{ marginTop: isDrawer ? 14 : 18 }}>
          {currentUser ? (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: isDrawer ? 12 : 14,
                padding: isDrawer ? "10px 11px" : "12px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: isDrawer ? 8 : 10, marginBottom: isDrawer ? 8 : 10 }}>
                <UserAvatar user={currentUser} size={isDrawer ? 33 : 41} showVerified />
                <div style={{ overflow: "hidden" }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: isDrawer ? 13 : 16,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {currentUser.username}
                  </div>
                  <div style={{ fontSize: isDrawer ? 10 : 13, color: "var(--accent)" }}>{currentUser.handle}</div>
                </div>
              </div>
              <button
                className="btn btn-ghost"
                style={{
                  width: "100%",
                  padding: isDrawer ? "6px" : "7px",
                  justifyContent: "center",
                  fontSize: isDrawer ? 13 : 16,
                }}
                onClick={() => {
                  onClose?.();
                  onLogout();
                }}
              >
                <Icon name="logout" size={isDrawer ? 14 : 17} />
                Logout
              </button>
            </div>
          ) : (
            <div style={{ padding: "0 4px" }}>
              <button
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", marginBottom: 4 }}
                onClick={() => {
                  onClose?.();
                  onLogin();
                }}
              >
                <Icon name="user" size={isDrawer ? 14 : 18} />
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
