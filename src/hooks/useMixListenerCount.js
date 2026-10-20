import { useEffect, useState } from "react";
import { fetchMixActiveListenerCount } from "../lib/mixListeners.js";

const POLL_MS = 20_000;

/**
 * Polls how many signed-in users are currently streaming this mix.
 */
export default function useMixListenerCount(mixId, { enabled = true } = {}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!mixId || !enabled) {
      setCount(0);
      return undefined;
    }

    let cancelled = false;

    const refresh = async () => {
      const next = await fetchMixActiveListenerCount(mixId);
      if (!cancelled) setCount(next);
    };

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [mixId, enabled]);

  return count;
}
