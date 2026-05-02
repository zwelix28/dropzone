import { useMemo } from "react";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Icon from "./Icon.jsx";
import UserAvatar from "./UserAvatar.jsx";

export default function TopBar({
  currentUser,
  onLogin,
  unreadCount = 0,
  onToggleNotifications,
  showMenuButton = false,
  onMenuClick,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const isMobile = useMediaQuery("(max-width: 720px)");

  const title = useMemo(() => {
    const map = {
      "/": "Home",
      "/discover": "Discover",
      "/live": "Live Streams",
      "/top10": "Top 10",
      "/upload": "Upload",
      "/profile": "My Profile",
      "/stats": "Statistics",
      "/settings": "Settings",
      "/admin": "Administration",
      "/register": "Create account",
    };
    if (location.pathname.startsWith("/user/")) return "Profile";
    if (location.pathname === "/messages") return "Messages";
    if (location.pathname.startsWith("/messages/")) return "Conversation";
    return map[location.pathname] || "Dropzone";
  }, [location.pathname]);

  const searchInput = (
    <div style={{ position: "relative", width: isMobile ? "100%" : "auto" }}>
      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
        <Icon name="search" size={15} color="var(--text3)" />
      </span>
      <input
        className="inp"
        placeholder="Search mixes…"
        defaultValue={params.get("q") || ""}
        onChange={(e) => {
          const q = e.target.value;
          if (location.pathname !== "/discover") navigate("/discover");
          const next = new URLSearchParams(params);
          if (q) next.set("q", q);
          else next.delete("q");
          setParams(next, { replace: true });
        }}
        style={{
          width: isMobile ? "100%" : 220,
          paddingLeft: 34,
          height: 40,
          fontSize: 16,
        }}
      />
    </div>
  );

  return (
    <div
      style={{
        minHeight: isMobile ? "auto" : 60,
        background: "rgba(7,9,15,0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
        gap: isMobile ? 10 : 16,
        position: "sticky",
        top: 0,
        zIndex: 100,
        ...(isMobile
          ? {
              padding: "12px",
              paddingTop: "max(12px, env(safe-area-inset-top, 0px))",
            }
          : { padding: "0 28px" }),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 10 : 16,
          width: "100%",
          minWidth: 0,
        }}
      >
        {showMenuButton ? (
          <button
            type="button"
            className="btn btn-ghost"
            aria-label="Open menu"
            onClick={onMenuClick}
            style={{
              padding: "10px 12px",
              flexShrink: 0,
              minWidth: 44,
              minHeight: 44,
              justifyContent: "center",
            }}
          >
            <Icon name="menu" size={22} color="var(--text2)" />
          </button>
        ) : null}

        <h2
          style={{
            fontWeight: 700,
            fontSize: isMobile ? 15 : 16,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </h2>

        {!isMobile ? searchInput : null}

        {!currentUser ? (
          <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "nowrap" }}>
            <button
              className="btn btn-ghost"
              style={{ padding: isMobile ? "8px 12px" : "7px 16px", fontSize: 13, whiteSpace: "nowrap" }}
              onClick={onLogin}
            >
              Sign In
            </button>
            <button
              className="btn btn-primary"
              style={{ padding: isMobile ? "8px 12px" : "7px 16px", fontSize: 13, whiteSpace: "nowrap" }}
              onClick={() => navigate("/register")}
            >
              Register
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={onToggleNotifications}
              style={{
                position: "relative",
                background: "none",
                color: "var(--text2)",
                padding: 10,
                minWidth: 44,
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Notifications"
            >
              <Icon name="bell" size={20} />
              {unreadCount > 0 ? (
                <span
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--red)",
                    border: "1px solid var(--bg)",
                  }}
                />
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              style={{ background: "none", padding: 4, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
              title="Go to my profile"
            >
              <UserAvatar user={currentUser} size={32} showVerified />
            </button>
          </div>
        )}
      </div>

      {isMobile ? searchInput : null}
    </div>
  );
}
