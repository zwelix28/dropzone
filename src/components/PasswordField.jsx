import { useState } from "react";
import Icon from "./Icon.jsx";

/**
 * Password input with a show/hide toggle (eye icon).
 * Works on mobile and desktop; the toggle sits inside the field on the right.
 */
export default function PasswordField({
  label = "Password",
  value,
  onChange,
  placeholder = "••••••••",
  autoComplete = "current-password",
  name,
  id,
  hint,
  error,
  disabled = false,
}) {
  const [visible, setVisible] = useState(false);
  const fieldId = id || name || "password-field";

  return (
    <div>
      <label
        htmlFor={fieldId}
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 5,
          color: "var(--text2)",
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={fieldId}
          className="inp"
          type={visible ? "text" : "password"}
          name={name}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={onChange}
          style={{
            paddingRight: 48,
            borderColor: error ? "var(--red)" : undefined,
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          title={visible ? "Hide password" : "Show password"}
          style={{
            position: "absolute",
            right: 4,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            color: "var(--text3)",
            padding: 10,
            minWidth: 44,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={visible ? "eyeOff" : "eye"} size={18} />
        </button>
      </div>
      {error ? (
        <p style={{ color: "var(--red)", fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>{error}</p>
      ) : hint ? (
        <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>{hint}</p>
      ) : null}
    </div>
  );
}
