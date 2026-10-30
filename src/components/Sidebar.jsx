import { Link, NavLink } from "react-router-dom";
import { FEATURE_DISCOVER, FEATURE_LETS_DJ, FEATURE_LIVE, FEATURE_STATS, FEATURE_TOP10, FEATURE_VAULT_FEED, signedInHomePath } from "../featureFlags.js";
import Icon from "./Icon.jsx";
import UserAvatar from "./UserAvatar.jsx";

function NavBtn({ to, icon, label, onClose, compact = false, state }) {
  const iconSize = compact ? 16 : 18;
  return (
    <NavLink
      to={to}
      state={state}
      className={({ isActive }) => `nav-link${isActive ? " active" : ""}${compact ? " is-compact" : ""}`}
      onClick={() => onClose?.()}
    >
      <span className="nav-link-icon" aria-hidden="true">
        <Icon name={icon} size={iconSize} />
      </span>
      <span className="nav-link-label">{label}</span>
    </NavLink>
  );
}

function LiveNavBtn({ onClose, compact = false }) {
  const iconSize = compact ? 16 : 18;
  return (
    <NavLink
      to="/live"
      className={({ isActive }) => `nav-link nav-link-live${isActive ? " active" : ""}${compact ? " is-compact" : ""}`}
      onClick={() => onClose?.()}
    >
      <span className="nav-link-icon" aria-hidden="true">
        <Icon name="radio" size={iconSize} />
      </span>
      <span className="nav-link-label">Live</span>
      <span className="nav-link-pro" title="Pro plan">
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
    <aside className={isDrawer ? "sidebar-shell sidebar-drawer" : "sidebar-shell sidebar-desktop"} data-unread={dmUnreadCount || undefined}>
      <div className="sidebar-shell-glow" aria-hidden="true" />

      {isDrawer ? (
        <div className="sidebar-drawer-bar">
          <span className="sidebar-drawer-title">Menu</span>
          <button type="button" className="sidebar-drawer-close" aria-label="Close menu" onClick={() => onClose?.()}>
            <Icon name="x" size={18} />
          </button>
        </div>
      ) : null}

      <div className={`sidebar-brand${isDrawer ? " is-drawer" : ""}`}>
        <Link
          to={currentUser ? signedInHomePath() : "/"}
          className="sidebar-brand-link"
          onClick={() => onClose?.()}
        >
          <img
            src="/logo.png"
            alt="Deep House Lab"
            width={isDrawer ? 34 : 42}
            height={isDrawer ? 34 : 42}
            className="sidebar-brand-mark"
          />
          <span className="sidebar-brand-name">Deep House Lab</span>
        </Link>
      </div>

      <div className="sidebar-nav-body">
        <div className="sidebar-nav-group">
          <div className="sidebar-nav-heading">Main</div>
          {!currentUser ? <NavBtn compact={isDrawer} to="/" icon="home" label="Home" onClose={onClose} /> : null}
          {currentUser ? (
            <NavBtn
              compact={isDrawer}
              to="/home"
              icon="home"
              label="Home"
              onClose={onClose}
              state={{ resetHomeGenre: true }}
            />
          ) : null}
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

        {currentUser ? (
          <div className="sidebar-nav-group">
            <div className="sidebar-nav-heading">Account</div>
            {FEATURE_STATS ? <NavBtn compact={isDrawer} to="/stats" icon="bar2" label="My Stats" onClose={onClose} /> : null}
            <NavBtn compact={isDrawer} to="/likes" icon="heart" label="Likes" onClose={onClose} />
            <NavBtn compact={isDrawer} to="/community" icon="community" label="Community" onClose={onClose} />
            <NavBtn compact={isDrawer} to="/profile" icon="user" label="My Profile" onClose={onClose} />
            <NavBtn compact={isDrawer} to="/connections" icon="people" label="Connections" onClose={onClose} />
            <NavBtn compact={isDrawer} to="/settings" icon="settings" label="Settings" onClose={onClose} />
            {currentUser?.isAdmin ? <NavBtn compact={isDrawer} to="/admin" icon="shield" label="Admin Panel" onClose={onClose} /> : null}
          </div>
        ) : null}

        <div className="sidebar-account-footer">
          {currentUser ? (
            <div className="sidebar-user-card">
              <div className="sidebar-user-row">
                <UserAvatar user={currentUser} size={isDrawer ? 28 : 40} showVerified />
                <div className="sidebar-user-meta">
                  <div className="sidebar-user-name">{currentUser.username}</div>
                  <div className="sidebar-user-handle">{currentUser.handle}</div>
                </div>
              </div>
              <button
                type="button"
                className="sidebar-logout"
                onClick={() => {
                  onClose?.();
                  onLogout();
                }}
              >
                <Icon name="logout" size={isDrawer ? 14 : 16} />
                Logout
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="sidebar-signin"
              onClick={() => {
                onClose?.();
                onLogin();
              }}
            >
              <Icon name="user" size={isDrawer ? 14 : 17} />
              Sign In
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
