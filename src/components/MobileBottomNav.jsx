import { useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import { primeForYouPlaybackFromGesture } from "../hooks/useForYouPreview.js";

const TABS = [
  { id: "home", label: "Home", icon: "home", to: "/home" },
  { id: "mixes", label: "Mixes", icon: "music", to: "/mixes" },
  { id: "foryou", label: "For You", icon: "zap", to: "/foryou" },
  { id: "profile", label: "Profile", icon: "user", to: "/profile" },
];

function pathMatches(tab, pathname) {
  if (tab.id === "home") return pathname === "/home" || pathname === "/";
  if (tab.id === "mixes") return pathname === "/mixes" || pathname.startsWith("/mix/");
  if (tab.id === "foryou") return pathname === "/foryou";
  if (tab.id === "profile") {
    // Settings / promote live under Profile, but keep highlight honest.
    return pathname === "/profile" || pathname === "/settings";
  }
  return false;
}

/**
 * Fixed mobile tab bar: Home, Mixes, For You, Profile.
 * Notifications stay in the TopBar. Sits under the mini player when visible.
 */
export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="mobile-bottom-nav" aria-label="Primary">
      {TABS.map((tab) => {
        const active = pathMatches(tab, location.pathname);
        return (
          <button
            key={tab.id}
            type="button"
            className={`mobile-bottom-nav-btn${active ? " is-active" : ""}`}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              // Home always returns to /home on the All crate filter for a clean reset.
              if (tab.id === "home") {
                navigate("/home", { state: { resetHomeGenre: true } });
                return;
              }
              // Unlock For You audio in this tap so the first mix can start immediately.
              if (tab.id === "foryou") {
                primeForYouPlaybackFromGesture();
                if (location.pathname === "/foryou") {
                  window.dispatchEvent(new CustomEvent("dhl:foryou-play-now"));
                  return;
                }
                navigate("/foryou", { state: { instantPlay: true } });
                return;
              }
              if (location.pathname !== tab.to) navigate(tab.to);
            }}
          >
            <span className="mobile-bottom-nav-icon-wrap">
              <Icon name={tab.icon} size={22} />
            </span>
            <span className="mobile-bottom-nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
