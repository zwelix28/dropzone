import Icon from "./Icon.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";

/** Desktop-only page title. On mobile the sticky TopBar shows the route title. */
export default function PageHeader({ icon, title, large = false, marginBottom = 20, style, children }) {
  const isMobile = useMediaQuery("(max-width: 720px)");
  if (isMobile) return null;

  if (children) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom, ...style }}>{children}</div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: icon ? 12 : 0, marginBottom, ...style }}>
      {icon ? <Icon name={icon} size={large ? 24 : 26} color="var(--accent)" /> : null}
      <h1
        style={{
          fontFamily: "var(--ff-display)",
          fontSize: large ? 40 : 32,
          letterSpacing: "0.04em",
          margin: 0,
        }}
      >
        {title}
      </h1>
    </div>
  );
}
