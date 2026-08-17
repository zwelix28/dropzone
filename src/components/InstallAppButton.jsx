import { useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon.jsx";
import useInstallPrompt from "../hooks/useInstallPrompt.js";

const APP_ICON = "/pwa-icon-192.png";

const IOS_STEPS = [
  { icon: "iosShare", text: "Tap the Share button in your browser toolbar." },
  { icon: "addToHomeScreen", text: "Choose Add to Home Screen." },
  { icon: "check", text: "Tap Add, then open Deep House Lab from your home screen." },
];

function IosInstructions({ onClose }) {
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Install Deep House Lab"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        background: "rgba(3,5,10,0.72)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          background: "var(--bg2)",
          borderTop: "1px solid var(--border)",
          borderRadius: "18px 18px 0 0",
          padding: 20,
          paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))",
          animation: "fadeIn 0.22s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <img
            src={APP_ICON}
            alt=""
            width={48}
            height={48}
            style={{ borderRadius: 12, flexShrink: 0, objectFit: "cover" }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Install Deep House Lab</div>
            <div style={{ fontSize: 12, color: "var(--text2)" }}>Add the app to your home screen</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              color: "var(--text2)",
              padding: 8,
              minWidth: 40,
              minHeight: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {IOS_STEPS.map((step, index) => (
            <li
              key={step.icon}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "var(--accent2)",
                  color: "#07090f",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </span>
              <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>{step.text}</span>
              <Icon name={step.icon} size={18} color="var(--accent)" />
            </li>
          ))}
        </ol>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Home-screen install control.
 *
 * Renders nothing once the app runs standalone, or on browsers that never
 * offer an install path, so the header stays uncluttered.
 */
export default function InstallAppButton({ compact = false }) {
  const { canPrompt, promptInstall, isIos, canInstall } = useInstallPrompt();
  const [showIosSteps, setShowIosSteps] = useState(false);

  if (!canInstall) return null;

  const handleClick = () => {
    if (canPrompt) {
      promptInstall();
      return;
    }
    if (isIos) setShowIosSteps(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Install Deep House Lab"
        aria-label="Install Deep House Lab"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          flexShrink: 0,
          height: 40,
          minWidth: compact ? 44 : 40,
          padding: compact ? 10 : "0 12px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "rgba(56,189,248,0.1)",
          color: "var(--accent)",
        }}
      >
        <Icon name="download" size={18} />
        {compact ? null : <span style={{ fontSize: 13, fontWeight: 600 }}>App</span>}
      </button>

      {showIosSteps ? <IosInstructions onClose={() => setShowIosSteps(false)} /> : null}
    </>
  );
}
