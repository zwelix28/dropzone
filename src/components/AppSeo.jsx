import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import usePageSeo from "../hooks/usePageSeo.js";
import { SEO_DEFAULTS } from "../lib/seo.js";

const ROUTE_SEO = [
  {
    test: (p) => p === "/",
    title: "Deep House Lab",
    description:
      "Deep House Lab is home for curated deep house mixes, resident DJs, and long listens — press play and stay in the groove.",
  },
  {
    test: (p) => p === "/register",
    title: "Create account",
    description:
      "Join Deep House Lab for deep cuts, late-night crates, and a player built for long listens — not algorithms.",
  },
  {
    test: (p) => p === "/mixes",
    title: "Mixes",
    description: "Browse full-length deep house mixes with artwork, crates, and release details on Deep House Lab.",
  },
  {
    test: (p) => p === "/home",
    title: "Home",
    description: "Continue listening, fresh crates, Top 5, and DJ of the month — your Deep House Lab home.",
  },
  {
    test: (p) => p === "/discover",
    title: "Discover",
    description: "Discover deep house singles and fresh drops on Deep House Lab.",
  },
  {
    test: (p) => p === "/foryou",
    title: "For You",
    description: "Personal deep house previews and recommendations on Deep House Lab.",
  },
  {
    test: (p) => p.startsWith("/floor") || p === "/on-the-floor",
    title: "On the Floor",
    description: "Nights, flyers, and floor energy from the Deep House Lab community.",
  },
  {
    test: (p) => p === "/community",
    title: "Community",
    description: "Meet Deep House Lab members, DJs, and listeners in the community.",
  },
];

/**
 * Default SEO for routes that do not set their own (mix/profile pages override).
 * Skips dynamic mix/user paths so those pages own the tags.
 */
export default function AppSeo() {
  const location = useLocation();
  const path = location.pathname || "/";

  const skip = path.startsWith("/mix/") || path.startsWith("/user/");

  const match = useMemo(() => {
    if (skip) return null;
    return ROUTE_SEO.find((row) => row.test(path)) || {
      title: SEO_DEFAULTS.title,
      description: SEO_DEFAULTS.description,
    };
  }, [path, skip]);

  usePageSeo(
    skip
      ? null
      : {
          title: match.title,
          description: match.description,
          path,
          image: SEO_DEFAULTS.image,
          type: "website",
          noindex: path.startsWith("/admin") || path.startsWith("/settings") || path.startsWith("/messages"),
        },
  );

  return null;
}
