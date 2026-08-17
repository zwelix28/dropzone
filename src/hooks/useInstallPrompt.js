import { useCallback, useEffect, useState } from "react";

function detectStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    window.navigator.standalone === true
  );
}

/** iPads running recent iPadOS report a desktop Safari user agent. */
function detectIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

/**
 * Tracks whether the app can be installed to the home screen.
 *
 * Chromium fires `beforeinstallprompt` once the install criteria are met, and
 * the saved event is the only way to open the prompt from our own button. iOS
 * has no such event, so there we surface the manual Add to Home Screen steps.
 */
export default function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(detectStandalone);
  const [isIos] = useState(detectIos);

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const displayMode = window.matchMedia?.("(display-mode: standalone)");
    const onDisplayModeChange = (event) => setIsStandalone(event.matches);
    displayMode?.addEventListener?.("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      displayMode?.removeEventListener?.("change", onDisplayModeChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return "unavailable";
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // The saved event can only be used once, whatever the user picked.
    setDeferredPrompt(null);
    return outcome;
  }, [deferredPrompt]);

  return {
    canPrompt: Boolean(deferredPrompt),
    promptInstall,
    isStandalone,
    isIos,
    canInstall: !isStandalone && (Boolean(deferredPrompt) || isIos),
  };
}
