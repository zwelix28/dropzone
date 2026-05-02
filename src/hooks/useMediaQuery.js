import { useEffect, useState } from "react";

export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(query);
    const update = () => setMatches(Boolean(mql.matches));
    update();

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", update);
      return () => mql.removeEventListener("change", update);
    }

    // Safari fallback
    // eslint-disable-next-line deprecation/deprecation
    mql.addListener(update);
    // eslint-disable-next-line deprecation/deprecation
    return () => mql.removeListener(update);
  }, [query]);

  return matches;
}

