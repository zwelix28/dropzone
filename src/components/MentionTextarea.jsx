import { useCallback, useMemo, useRef, useState } from "react";
import UserAvatar from "./UserAvatar.jsx";
import {
  filterUsersForMention,
  formatMentionHandle,
  getActiveMentionQuery,
} from "../lib/mentions.js";

export default function MentionTextarea({
  value,
  onChange,
  users = [],
  excludeUserId,
  maxLength = 500,
  placeholder = "Add a comment…",
  onSubmit,
  disabled = false,
}) {
  const textareaRef = useRef(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);

  const mentionQuery = useMemo(() => getActiveMentionQuery(value, cursorPos), [value, cursorPos]);

  const suggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    return filterUsersForMention(users, mentionQuery, { excludeUserId });
  }, [mentionQuery, users, excludeUserId]);

  const showSuggestions = mentionQuery !== null && suggestions.length > 0;

  const insertMention = useCallback(
    (user) => {
      const el = textareaRef.current;
      if (!el) return;

      const cursor = el.selectionStart ?? value.length;
      const before = value.slice(0, cursor);
      const after = value.slice(cursor);
      const atIndex = before.lastIndexOf("@");
      if (atIndex < 0) return;

      const handle = formatMentionHandle(user.handle || user.username);
      const nextBefore = `${before.slice(0, atIndex)}${handle} `;
      const nextValue = `${nextBefore}${after}`.slice(0, maxLength);
      onChange(nextValue);

      const nextCursor = nextBefore.length;
      window.requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(nextCursor, nextCursor);
      });
      setMentionIndex(0);
    },
    [maxLength, onChange, value],
  );

  const handleKeyDown = (e) => {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(suggestions[mentionIndex] || suggestions[0]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionIndex(0);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.(e);
    }
  };

  return (
    <div className="mention-textarea-wrap">
      <textarea
        ref={textareaRef}
        className="inp for-you-comments-textarea"
        placeholder={placeholder}
        value={value}
        maxLength={maxLength}
        rows={1}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setCursorPos(e.target.selectionStart ?? e.target.value.length);
          setMentionIndex(0);
        }}
        onSelect={(e) => setCursorPos(e.target.selectionStart ?? 0)}
        onKeyUp={(e) => setCursorPos(e.target.selectionStart ?? 0)}
        onKeyDown={handleKeyDown}
        onClick={() => {
          const el = textareaRef.current;
          if (el) setCursorPos(el.selectionStart ?? 0);
          setMentionIndex(0);
        }}
      />
      {showSuggestions ? (
        <ul className="mention-suggestions" role="listbox" aria-label="Mention suggestions">
          {suggestions.map((user, i) => (
            <li key={user.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === mentionIndex}
                className={`mention-suggestion ${i === mentionIndex ? "active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(user);
                }}
              >
                <UserAvatar user={user} size={24} showVerified={false} />
                <span className="mention-suggestion-text">
                  <span className="mention-suggestion-name">{user.username || "DJ"}</span>
                  <span className="mention-suggestion-handle">
                    {formatMentionHandle(user.handle || user.username)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
