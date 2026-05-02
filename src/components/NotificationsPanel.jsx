import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";

export default function NotificationsPanel({
  notifications,
  onClose,
  onMarkAllRead,
  onMarkRead,
  isMobile = false,
}) {
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 950,
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        className="glass"
        style={{
          position: "absolute",
          top: isMobile ? "calc(56px + env(safe-area-inset-top, 0px))" : 76,
          left: isMobile ? 12 : "auto",
          right: isMobile ? 12 : 24,
          width: isMobile ? "auto" : 420,
          maxWidth: isMobile ? "none" : "calc(100vw - 32px)",
          maxHeight: isMobile ? "min(70vh, calc(100dvh - 120px))" : undefined,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ fontWeight: 800 }}>Notifications</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: 12 }} onClick={onMarkAllRead}>
              Mark all read
            </button>
            <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: 12 }} onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div style={{ maxHeight: "60vh", overflow: "auto" }}>
          {notifications.length === 0 ? (
            <div style={{ padding: 18, color: "var(--text3)" }}>No notifications yet.</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(30,45,69,0.6)",
                  background: n.read ? "transparent" : "rgba(56,189,248,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0, display: "flex", gap: 10, alignItems: "flex-start" }}>
                    {n.type === "follow" ? (
                      <span
                        style={{
                          flexShrink: 0,
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "rgba(52,211,153,0.12)",
                          border: "1px solid rgba(52,211,153,0.25)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        aria-hidden
                      >
                        <Icon name="people" size={16} color="var(--green)" />
                      </span>
                    ) : null}
                    {n.type === "dm" ? (
                      <span
                        style={{
                          flexShrink: 0,
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "rgba(56,189,248,0.12)",
                          border: "1px solid rgba(56,189,248,0.25)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        aria-hidden
                      >
                        <Icon name="mail" size={16} color="var(--accent)" />
                      </span>
                    ) : null}
                    <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 2 }}>{n.title}</div>
                    <div style={{ color: "var(--text2)", fontSize: 12, lineHeight: 1.5 }}>{n.message}</div>
                    <div style={{ color: "var(--text3)", fontSize: 11, marginTop: 6 }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                    </div>
                  </div>
                  {!n.read ? (
                    <button
                      className="btn btn-ghost"
                      style={{ padding: "6px 10px", fontSize: 12, flexShrink: 0 }}
                      onClick={() => onMarkRead(n.id)}
                    >
                      Read
                    </button>
                  ) : null}
                </div>

                {n.href ? (
                  <div style={{ marginTop: 10 }}>
                    <Link className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: 12 }} to={n.href} onClick={onClose}>
                      View
                    </Link>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

