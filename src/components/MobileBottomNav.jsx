import { useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";

const TABS = [
  { id: "home", label: "Home", icon: "home", to: "/home" },
  { id: "mixes", label: "Mixes", icon: "music", to: "/mixes" },
  { id: "notifications", label: "Alerts", icon: "bell", action: "notifications" },
];

function pathMatches(tab, pathname) {
  if (tab.id === "home") return pathname === "/home" || pathname === "/";
  if (tab.id === "mixes") {
    return pathname === "/mixes" || pathname.startsWith("/mix/");
  }
  return false;
}

/**
 * Fixed mobile tab bar: Home, Mixes, Notifications.
 * Sits under the mini player when one is visible.
 */
export default function MobileBottomNav({
  unreadCount = 0,
  notificationsOpen = false,
  onNotifications,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="mobile-bottom-nav" aria-label="Primary">
      {TABS.map((tab) => {
        const isAction = tab.action === "notifications";
        const active = isAction ? notificationsOpen : pathMatches(tab, location.pathname);
        return (
          <button
            key={tab.id}
            type="button"
            className={`mobile-bottom-nav-btn${active ? " is-active" : ""}`}
            aria-label={tab.label}
            aria-current={active && !isAction ? "page" : undefined}
            aria-pressed={isAction ? notificationsOpen : undefined}
            onClick={() => {
              if (isAction) {
                onNotifications?.();
                return;
              }
              // Home always returns to /home on the All crate filter for a clean reset.
              if (tab.id === "home") {
                navigate("/home", { state: { resetHomeGenre: true } });
                return;
              }
              if (location.pathname !== tab.to) navigate(tab.to);
            }}
          >
            <span className="mobile-bottom-nav-icon-wrap">
              <Icon name={tab.icon} size={22} />
              {isAction && unreadCount > 0 ? (
                <span className="mobile-bottom-nav-badge" aria-hidden="true" />
              ) : null}
            </span>
            <span className="mobile-bottom-nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
