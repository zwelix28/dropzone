import { Link, NavLink } from "react-router-dom";
import { FEATURE_LETS_DJ } from "../featureFlags.js";
import Icon from "./Icon.jsx";
import UserAvatar from "./UserAvatar.jsx";

function NavBtn({ to, icon, label, onClose }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
      onClick={() => onClose?.()}
    >
      <Icon name={icon} size={17} />
      {label}
    </NavLink>
  );
}

function LiveNavBtn({ onClose }) {
  return (
    <NavLink
      to="/live"
      className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
      onClick={() => onClose?.()}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Icon name="radio" size={17} />
        Live
      </span>
      <span
        title="Pro plan"
        style={{
          fontSize: 9,
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

function MessagesNavLink({ onClose, unreadCount }) {
  return (
    <NavLink
      to="/messages"
      className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
      onClick={() => onClose?.()}
      style={{ position: "relative" }}
    >
      <Icon name="mail" size={17} />
      Messages
      {unreadCount > 0 ? (
        <span
          style={{
            marginLeft: "auto",
            minWidth: 20,
            height: 20,
            padding: "0 6px",
            borderRadius: 10,
            background: "var(--accent2)",
            color: "#07090f",
            fontSize: 11,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </NavLink>
  );
}

/**
 * @param {{ currentUser: any, onLogout: () => void, onLogin: () => void, variant?: 'desktop' | 'drawer', onClose?: () => void, dmUnreadCount?: number }} props
 */
export default function Sidebar({ currentUser, onLogout, onLogin, variant = "desktop", onClose, dmUnreadCount = 0 }) {
  const isDrawer = variant === "drawer";
  const bottomPadding = isDrawer ? 20 : 90;

  return (
    <aside
      style={{
        width: isDrawer ? "100%" : 220,
        height: isDrawer ? "100%" : "auto",
        minHeight: isDrawer ? "100%" : "100vh",
        background: "var(--bg2)",
        borderRight: isDrawer ? "none" : "1px solid var(--border)",
        padding: "0 12px",
        position: isDrawer ? "relative" : "sticky",
        top: isDrawer ? "auto" : 0,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        overflowY: isDrawer ? "auto" : "visible",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {isDrawer ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 4px 12px",
            borderBottom: "1px solid var(--border)",
            marginBottom: 12,
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
            style={{ padding: "8px 10px", minWidth: 40, justifyContent: "center" }}
          >
            <Icon name="x" size={20} color="var(--text2)" />
          </button>
        </div>
      ) : null}

      <div
        style={{
          padding: isDrawer ? "0 8px 16px" : "22px 8px 20px",
          borderBottom: isDrawer ? "none" : "1px solid var(--border)",
          marginBottom: isDrawer ? 8 : 16,
        }}
      >
        <Link
          to={currentUser ? "/discover" : "/"}
          style={{ textDecoration: "none", color: "inherit" }}
          onClick={() => onClose?.()}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "linear-gradient(135deg, var(--accent2), #0284C7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="headphones" size={18} color="#fff" />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--ff-display)",
                  fontSize: 22,
                  letterSpacing: "0.05em",
                  lineHeight: 1,
                }}
              >
                DROPZONE
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--accent)",
                  letterSpacing: "0.15em",
                  marginTop: 1,
                }}
              >
                DJ PLATFORM
              </div>
            </div>
          </div>
        </Link>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text3)",
            letterSpacing: "0.12em",
            padding: "0 8px",
            marginBottom: 6,
          }}
        >
          MAIN
        </div>
        {!currentUser ? <NavBtn to="/" icon="home" label="Home" onClose={onClose} /> : null}
        <NavBtn to="/discover" icon="compass" label="Discover" onClose={onClose} />
        <LiveNavBtn onClose={onClose} />
        <NavBtn to="/top10" icon="trending" label="Top 10" onClose={onClose} />
        <NavBtn to="/upload" icon="upload" label="Upload" onClose={onClose} />
        {FEATURE_LETS_DJ ? <NavBtn to="/dj" icon="disc" label={"Let's DJ"} onClose={onClose} /> : null}
      </div>

      {currentUser && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text3)",
              letterSpacing: "0.12em",
              padding: "0 8px",
              marginBottom: 6,
            }}
          >
            ACCOUNT
          </div>
          <NavBtn to="/stats" icon="bar2" label="My Stats" onClose={onClose} />
          <NavBtn to="/likes" icon="heart" label="Likes" onClose={onClose} />
          <NavBtn to="/profile" icon="user" label="My Profile" onClose={onClose} />
          <NavBtn to="/connections" icon="people" label="Connections" onClose={onClose} />
          <NavBtn to="/settings" icon="settings" label="Settings" onClose={onClose} />
          {currentUser?.isAdmin ? <NavBtn to="/admin" icon="shield" label="Admin" onClose={onClose} /> : null}
        </div>
      )}

      <div style={{ marginTop: isDrawer ? 20 : "auto", paddingBottom: bottomPadding }}>
        {currentUser ? (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "12px 14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <UserAvatar user={currentUser} size={34} showVerified />
              <div style={{ overflow: "hidden" }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentUser.username}
                </div>
                <div style={{ fontSize: 11, color: "var(--accent)" }}>{currentUser.handle}</div>
              </div>
            </div>
            <button
              className="btn btn-ghost"
              style={{
                width: "100%",
                padding: "7px",
                justifyContent: "center",
                fontSize: 13,
              }}
              onClick={() => {
                onClose?.();
                onLogout();
              }}
            >
              <Icon name="logout" size={14} />
              Logout
            </button>
          </div>
        ) : (
          <div style={{ padding: "0 4px" }}>
            <button
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", marginBottom: 8 }}
              onClick={() => {
                onClose?.();
                onLogin();
              }}
            >
              <Icon name="user" size={15} />
              Sign In
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
