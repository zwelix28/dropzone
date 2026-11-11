import { useEffect, useMemo, useState } from "react";
import MixTracklist from "./MixTracklist.jsx";
import { normalizeTracklist, tracklistToText } from "../lib/tracklist.js";

/**
 * Optional tracklist field: paste plain text, confirm format, then only the
 * themed MixTracklist stays visible (clear text is hidden until Edit).
 */
export default function TracklistEditor({
  value = "",
  onChange,
  compact = false,
  label = "Tracklist",
}) {
  const normalizedValue = useMemo(() => tracklistToText(value), [value]);
  const [enabled, setEnabled] = useState(Boolean(normalizedValue));
  const [draft, setDraft] = useState(normalizedValue);
  /** Once formatted/confirmed, hide the textarea and show only MixTracklist. */
  const [confirmed, setConfirmed] = useState(Boolean(normalizedValue));

  useEffect(() => {
    setDraft(normalizedValue);
    if (normalizedValue) {
      setEnabled(true);
      setConfirmed(true);
    } else {
      setConfirmed(false);
    }
  }, [normalizedValue]);

  const preview = useMemo(() => normalizeTracklist(draft), [draft]);

  const commit = (raw, { confirm = true } = {}) => {
    const normalized = normalizeTracklist(raw);
    const text = normalized.join("\n");
    setDraft(text);
    onChange?.(text);
    if (confirm && normalized.length) {
      setConfirmed(true);
      setEnabled(true);
    } else if (confirm && !normalized.length) {
      setConfirmed(false);
    }
  };

  const toggle = (on) => {
    setEnabled(on);
    if (!on) {
      setDraft("");
      setConfirmed(false);
      onChange?.("");
      return;
    }
    setConfirmed(false);
  };

  const openEditor = () => {
    setConfirmed(false);
    setEnabled(true);
    setDraft(normalizedValue || draft);
  };

  return (
    <div className={`tracklist-editor${compact ? " is-compact" : ""}`}>
      <div className="tracklist-editor-toggle-row">
        <div>
          <div className="tracklist-editor-label">{label}</div>
          <div className="tracklist-editor-hint">
            Optional. Paste lines like <code>01. Artist - Song title</code>, then format — only the styled list is kept on screen.
          </div>
        </div>
        {!confirmed ? (
          <button
            type="button"
            className={`tracklist-editor-switch${enabled ? " is-on" : ""}`}
            aria-pressed={enabled}
            onClick={() => toggle(!enabled)}
          >
            {enabled ? "Included" : "Add tracklist"}
          </button>
        ) : (
          <div className="tracklist-editor-confirmed-actions">
            <button type="button" className="btn btn-ghost tracklist-editor-format-btn" onClick={openEditor}>
              Edit
            </button>
            <button
              type="button"
              className="btn btn-ghost tracklist-editor-format-btn"
              onClick={() => toggle(false)}
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {enabled && confirmed && preview.length ? (
        <MixTracklist tracklist={preview} compact title="Tracklist" />
      ) : null}

      {enabled && !confirmed ? (
        <>
          <textarea
            className="inp tracklist-editor-input"
            value={draft}
            placeholder={"01. Kerri Chandler - A Night In The Life\n02. Moodymann - I Can't Kick This Feeling When It Hits\n03. Larry Heard - Distant Planet"}
            onChange={(e) => {
              setDraft(e.target.value);
              setConfirmed(false);
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData?.getData("text");
              if (!pasted) return;
              e.preventDefault();
              const merged = draft ? `${draft.replace(/\s+$/, "")}\n${pasted}` : pasted;
              setDraft(merged);
              setConfirmed(false);
            }}
          />
          <div className="tracklist-editor-meta">
            <span>
              {preview.length
                ? `${preview.length} tracks ready — confirm to hide the plain text`
                : "Paste or type Artist - Title lines"}
            </span>
            {preview.length ? (
              <button
                type="button"
                className="btn btn-primary tracklist-editor-format-btn"
                onClick={() => commit(draft, { confirm: true })}
              >
                Confirm format
              </button>
            ) : draft.trim() ? (
              <button
                type="button"
                className="btn btn-ghost tracklist-editor-format-btn"
                onClick={() => commit(draft, { confirm: false })}
              >
                Try format
              </button>
            ) : null}
          </div>
          {preview.length ? <MixTracklist tracklist={preview} compact title="Preview" /> : null}
        </>
      ) : null}
    </div>
  );
}
