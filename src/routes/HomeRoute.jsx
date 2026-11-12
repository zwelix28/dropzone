import { Navigate } from "react-router-dom";
import HomePage from "../pages/HomePage.jsx";
import { useApp } from "../context/AppContext.jsx";
import { signedInHomePath } from "../featureFlags.js";
import { isPasswordRecoveryPending } from "../lib/passwordRecovery.js";

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
  if (isPasswordRecoveryPending()) {
    return <Navigate to="/reset-password" replace />;
  }
  if (auth.session?.user?.id) {
    // Always Lab Home — never dump signed-in users onto Mixes/Profile by accident.
    return <Navigate to={signedInHomePath()} replace />;
  }
  return <HomePage />;
}
