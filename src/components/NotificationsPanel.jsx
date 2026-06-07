import { useMemo } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";
import { fmtNotificationTime, getNotificationPresentation } from "../lib/notificationDisplay.js";

function NotificationRow({ notification, onClose, onMarkRead, compact = false }) {
  const preset = getNotificationPresentation(notification);
  const timeLabel = fmtNotificationTime(notification.createdAt);

  const handleOpen = () => {
    if (!notification.read) onMarkRead(notification.id);
    onClose();
  };

  return (
    <div
      style={{
        padding: compact ? "9px 12px" : "12px 16px",
        borderBottom: "1px solid rgba(30,45,69,0.6)",
        background: notification.read ? "transparent" : "rgba(56,189,248,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: compact ? 9 : 12 }}>
        <span
          style={{
            flexShrink: 0,
            width: compact ? 30 : 36,
            height: compact ? 30 : 36,
            borderRadius: compact ? 8 : 10,
            background: `${preset.color}18`,
            border: `1px solid ${preset.color}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-hidden
        >
          <Icon name={preset.icon} size={compact ? 14 : 17} color={preset.color} />
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: compact ? 2 : 4, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: compact ? 9 : 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: preset.color,
              }}
            >
              {preset.category}
            </span>
            {!notification.read ? (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  flexShrink: 0,
                }}
                aria-label="Unread"
              />
            ) : null}
            <span style={{ marginLeft: "auto", color: "var(--text3)", fontSize: compact ? 10 : 11, flexShrink: 0 }}>
              {timeLabel}
            </span>
          </div>

          <div
            style={{
              fontWeight: 700,
              fontSize: compact ? 12 : 14,
              marginBottom: compact ? 2 : 4,
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: compact ? "nowrap" : undefined,
            }}
          >
            {notification.title}
          </div>
          <div
            style={{
              color: "var(--text2)",
              fontSize: compact ? 11 : 13,
              lineHeight: 1.4,
              display: compact ? "-webkit-box" : undefined,
              WebkitLineClamp: compact ? 2 : undefined,
              WebkitBoxOrient: compact ? "vertical" : undefined,
              overflow: compact ? "hidden" : undefined,
            }}
          >
            {notification.message}
          </div>

          {notification.href ? (
            <div style={{ marginTop: compact ? 6 : 10 }}>
              <Link
                className="btn btn-ghost"
                style={{ padding: compact ? "5px 10px" : "7px 12px", fontSize: compact ? 11 : 12 }}
                to={notification.href}
                onClick={handleOpen}
              >
                View
              </Link>
            </div>
          ) : null}
        </div>

        {!notification.read ? (
          <button
            type="button"
            className="btn btn-ghost"
            style={{
              padding: compact ? "4px 8px" : "6px 10px",
              fontSize: compact ? 10 : 12,
              flexShrink: 0,
              alignSelf: "flex-start",
            }}
            onClick={() => onMarkRead(notification.id)}
          >
            Read
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function NotificationsPanel({
  notifications,
  onClose,
  onMarkAllRead,
  onMarkRead,
  isMobile = false,
}) {
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 950,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        padding: isMobile
          ? "calc(56px + env(safe-area-inset-top, 0px)) 12px 12px"
          : "76px 24px 24px",
      }}
    >
      <div
        className="glass"
        role="dialog"
        aria-label="Notifications"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isMobile ? "min(100%, 320px)" : 420,
          maxWidth: isMobile ? "calc(100vw - 24px)" : "calc(100vw - 32px)",
          maxHeight: isMobile ? "min(48dvh, 340px)" : "min(70vh, 560px)",
          borderRadius: 14,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isMobile ? "10px 12px" : "14px 16px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: isMobile ? 14 : 16 }}>Notifications</div>
            {unreadCount > 0 ? (
              <div style={{ fontSize: isMobile ? 10 : 12, color: "var(--text3)", marginTop: 1 }}>
                {unreadCount} unread
              </div>
            ) : (
              <div style={{ fontSize: isMobile ? 10 : 12, color: "var(--text3)", marginTop: 1 }}>
                You&apos;re all caught up
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: isMobile ? 4 : 8, flexShrink: 0 }}>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: isMobile ? "5px 8px" : "7px 12px", fontSize: isMobile ? 10 : 12 }}
                onClick={onMarkAllRead}
              >
                {isMobile ? "Read all" : "Mark all read"}
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: isMobile ? "5px 8px" : "7px 12px", fontSize: isMobile ? 10 : 12 }}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}>
          {notifications.length === 0 ? (
            <div style={{ padding: isMobile ? "20px 14px" : "32px 20px", textAlign: "center", color: "var(--text3)" }}>
              <Icon name="bell" size={isMobile ? 24 : 32} color="var(--text3)" />
              <p style={{ marginTop: isMobile ? 8 : 12, fontSize: isMobile ? 12 : 14, lineHeight: 1.45 }}>
                No notifications yet. Follow DJs to hear when they upload, and you&apos;ll get play milestones on your mixes.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onClose={onClose}
                onMarkRead={onMarkRead}
                compact={isMobile}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
