/** Client locale hints for presence / login analytics (no IP lookup). */
export function getClientLocaleHints() {
  let timezone = "";
  let region = "";
  let country = "";

  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    timezone = "";
  }

  try {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
    const primary = (langs[0] || "").trim();
    region = primary;
    const parts = primary.split(/[-_]/);
    if (parts.length >= 2) {
      country = parts[parts.length - 1].toUpperCase();
    }
  } catch {
    region = "";
    country = "";
  }

  return { timezone, region, country };
}
