import { Navigate } from "react-router-dom";
import HomePage from "../pages/HomePage.jsx";
import { useApp } from "../context/AppContext.jsx";
import { signedInHomePath } from "../featureFlags.js";

/** Guest landing is for visitors only; signed-in users go straight into the vault. */
export default function HomeRoute() {
  const { auth } = useApp();
  if (auth.authLoading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--text2)", fontSize: 14 }}>
        Loading…
      </div>
    );
  }
  if (auth.session?.user?.id) return <Navigate to={signedInHomePath()} replace />;
  return <HomePage />;
}
