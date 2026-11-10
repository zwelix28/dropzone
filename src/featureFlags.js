/** Toggle to restore Let's DJ in the nav and the `/dj` route. */
export const FEATURE_LETS_DJ = false;

/** Toggle to show Live Streams in the nav, home page, and `/live` route. */
export const FEATURE_LIVE = false;

/** Toggle Discover page in nav and `/discover` route. */
export const FEATURE_DISCOVER = false;

/** Toggle Top 10 page in nav and `/top10` route. */
export const FEATURE_TOP10 = false;

/** Toggle Vault Feed page in nav and `/vault-feed` route. */
export const FEATURE_VAULT_FEED = false;

/** Toggle My Stats page in nav and `/stats` route. */
export const FEATURE_STATS = false;

/** Mix page listener comments. Off while the section is parked. */
export const FEATURE_MIX_COMMENTS = false;

/** Toggle Community page in nav and `/community` route. */
export const FEATURE_COMMUNITY = false;

/** Toggle On the Floor browse page in nav and `/floor` route. */
export const FEATURE_ON_THE_FLOOR = false;

/**
 * Default landing / “home” path for signed-in users.
 * Must match the Home tab (`/home` Lab home). Catalog browse is `/mixes`.
 */
export function signedInHomePath() {
  if (FEATURE_DISCOVER) return "/discover";
  return "/home";
}
