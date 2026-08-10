/** @mention parsing and user lookup (handles like @deephouselab). */

export const MENTION_REGEX = /@([a-zA-Z0-9_.]+)/g;
export const MENTION_QUERY_REGEX = /@([a-zA-Z0-9_.]*)$/;

export function normalizeMentionHandle(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "";
  return s.startsWith("@") ? s.slice(1) : s;
}

export function formatMentionHandle(raw) {
  const key = normalizeMentionHandle(raw);
  return key ? `@${key}` : "";
}

export function extractMentionHandles(text) {
  const handles = new Set();
  const re = new RegExp(MENTION_REGEX.source, "g");
  let match = re.exec(String(text || ""));
  while (match) {
    handles.add(normalizeMentionHandle(match[1]));
    match = re.exec(String(text || ""));
  }
  return [...handles];
}

export function userMentionKeys(user) {
  if (!user?.id) return [];
  const keys = new Set();
  const fromHandle = normalizeMentionHandle(user.handle);
  const fromUsername = normalizeMentionHandle(String(user.username || "").replace(/\s/g, ""));
  if (fromHandle) keys.add(fromHandle);
  if (fromUsername) keys.add(fromUsername);
  return [...keys];
}

export function findUserByMention(users, token) {
  const key = normalizeMentionHandle(token);
  if (!key) return null;
  return (
    users.find((user) => {
      const keys = userMentionKeys(user);
      return keys.includes(key);
    }) || null
  );
}

export function getActiveMentionQuery(text, cursorPos) {
  const before = String(text || "").slice(0, cursorPos ?? String(text || "").length);
  const match = before.match(MENTION_QUERY_REGEX);
  if (!match) return null;
  return match[1].toLowerCase();
}

export function filterUsersForMention(users, query, { limit = 6, excludeUserId } = {}) {
  const q = String(query || "").toLowerCase();
  const scored = [];

  for (const user of users) {
    if (!user?.id || user.id === excludeUserId) continue;
    const handle = normalizeMentionHandle(user.handle);
    const usernameKey = normalizeMentionHandle(String(user.username || "").replace(/\s/g, ""));
    const username = String(user.username || "").toLowerCase();

    let score = -1;
    if (!q) {
      score = 0;
    } else if (handle.startsWith(q)) {
      score = 3;
    } else if (usernameKey.startsWith(q)) {
      score = 2;
    } else if (username.includes(q.replace(/[_.]/g, " ")) || username.replace(/\s/g, "").includes(q)) {
      score = 1;
    }

    if (score >= 0) {
      scored.push({ user, score, handle: handle || usernameKey });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.handle.localeCompare(b.handle));
  return scored.slice(0, limit).map((row) => row.user);
}

export function splitCommentWithMentions(text) {
  const parts = [];
  const re = new RegExp(MENTION_REGEX.source, "g");
  let lastIndex = 0;
  let match = re.exec(String(text || ""));

  while (match) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "mention", value: match[0], token: match[1] });
    lastIndex = match.index + match[0].length;
    match = re.exec(String(text || ""));
  }

  if (lastIndex < String(text || "").length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts;
}
