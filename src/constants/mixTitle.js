/** Every mix title on the platform carries the house prefix. */
export const MIX_TITLE_PREFIX = "Deep House Lab Pres.: ";

const PREFIX_CORE = MIX_TITLE_PREFIX.trimEnd();

/**
 * Keep the house prefix on a title while the user types, including when they
 * backspace into it. Whatever they add after the colon is left untouched.
 */
export function withMixTitlePrefix(value) {
  const raw = (value ?? "").replace(/^\s+/, "");
  if (!raw) return MIX_TITLE_PREFIX;

  const lower = raw.toLowerCase();
  const coreLower = PREFIX_CORE.toLowerCase();

  if (lower.startsWith(coreLower)) {
    return MIX_TITLE_PREFIX + raw.slice(PREFIX_CORE.length).replace(/^\s+/, "");
  }
  // Partially deleted prefix — restore it rather than duplicating it.
  if (coreLower.startsWith(lower)) return MIX_TITLE_PREFIX;

  return MIX_TITLE_PREFIX + raw;
}

/** The part of the title the user actually wrote, with the prefix removed. */
export function mixTitleBody(value) {
  const withPrefix = withMixTitlePrefix(value);
  return withPrefix.slice(MIX_TITLE_PREFIX.length).trim();
}
