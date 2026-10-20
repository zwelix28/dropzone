import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";

/**
 * Pill-shaped back control that matches genre tag styling.
 * Use for page-level navigation (Profile, Community, Mix detail, etc.).
 */
export default function BackButton({ to, label = "Back", onClick, className = "", style }) {
  const content = (
    <>
      <Icon name="chevronLeft" size={14} />
      <span>{label}</span>
    </>
  );

  if (typeof onClick === "function" && !to) {
    return (
      <button type="button" className={`back-btn ${className}`.trim()} style={style} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <Link to={to || "/"} className={`back-btn ${className}`.trim()} style={style} onClick={onClick}>
      {content}
    </Link>
  );
}
