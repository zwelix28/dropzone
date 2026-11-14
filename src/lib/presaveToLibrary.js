import { addMixPresave, removeMixPresave } from "./mixPresaves.js";

/**
 * Save a pre-save mix into Library and return toast copy.
 * Caller shows auth modal when not signed in.
 */
export async function presaveMixToLibrary({ userId, mixId, mixTitle }) {
  if (!userId) {
    return { ok: false, needsAuth: true };
  }
  const result = await addMixPresave(userId, mixId);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error || "Could not add this mix to your library.",
    };
  }
  const label = (mixTitle || "Mix").trim() || "Mix";
  return {
    ok: true,
    already: Boolean(result.already),
    toast: {
      tone: "presave",
      icon: "check",
      title: result.already ? "Already in Library" : "Added to Library",
      message: result.already
        ? `“${label}” is already saved. Find it under Library.`
        : `“${label}” was added to Library. We’ll keep it ready until it goes live.`,
    },
  };
}

/** Remove a pre-save bookmark from Library. */
export async function unsaveMixFromLibrary({ userId, mixId, mixTitle }) {
  if (!userId) {
    return { ok: false, needsAuth: true };
  }
  const result = await removeMixPresave(userId, mixId);
  if (!result.ok) {
    return {
      ok: false,
      error: "Could not remove this mix from your library.",
    };
  }
  const label = (mixTitle || "Mix").trim() || "Mix";
  return {
    ok: true,
    toast: {
      tone: "presave",
      icon: "check",
      title: "Removed from Library",
      message: `“${label}” is no longer saved.`,
    },
  };
}
