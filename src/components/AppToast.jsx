import { useEffect } from "react";
import Icon from "./Icon.jsx";

/** Compact in-app toast — sits above the player / tab bar, never full-screen. */
export default function AppToast({ toast, onDismiss, lift = "none" }) {
  useEffect(() => {
    if (!toast) return undefined;
    const ms = Number(toast.durationMs) > 0 ? Number(toast.durationMs) : 3200;
    const t = window.setTimeout(() => onDismiss?.(), ms);
    return () => window.clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const liftClass =
    lift === "player-tabs"
      ? " is-above-player-tabs"
      : lift === "player"
        ? " is-above-player"
        : lift === "tabs"
          ? " is-above-tabs"
          : "";

  return (
    <div className={`app-toast-host${liftClass}`} aria-live="polite" aria-atomic="true">
      <div
        className={`app-toast${
          toast.tone === "presave" ? " is-presave" : toast.tone === "ok" ? " is-ok" : ""
        }`}
        role="status"
      >
        <span className="app-toast-icon" aria-hidden="true">
          <Icon name={toast.icon || "check"} size={16} color="currentColor" />
        </span>
        <div className="app-toast-copy">
          {toast.title ? <strong>{toast.title}</strong> : null}
          {toast.message ? <span>{toast.message}</span> : null}
        </div>
        <button type="button" className="app-toast-close" aria-label="Dismiss" onClick={() => onDismiss?.()}>
          <Icon name="x" size={14} />
        </button>
      </div>
    </div>
  );
}
