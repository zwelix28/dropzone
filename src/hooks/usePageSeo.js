import { useEffect } from "react";
import { applyPageSeo } from "../lib/seo.js";

/** Keep document title / meta / JSON-LD in sync with the active view. */
export default function usePageSeo(opts) {
  const enabled = Boolean(opts);
  const title = opts?.title;
  const description = opts?.description;
  const path = opts?.path;
  const image = opts?.image;
  const type = opts?.type;
  const noindex = opts?.noindex;
  const jsonLd = opts?.jsonLd;

  useEffect(() => {
    if (!enabled) return;
    applyPageSeo({
      title,
      description,
      path,
      image,
      type,
      noindex,
      jsonLd,
    });
  }, [enabled, title, description, path, image, type, noindex, jsonLd]);
}
