import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout.jsx";
import { useApp } from "./context/AppContext.jsx";
import HomeRoute from "./routes/HomeRoute.jsx";
import DiscoverPage from "./pages/DiscoverPage.jsx";
import ForYouPage from "./pages/ForYouPage.jsx";
import LiveRoute from "./pages/LiveRoute.jsx";
import Top10Page from "./pages/Top10Page.jsx";
import UploadPage from "./pages/UploadPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import ConnectionsPage from "./pages/ConnectionsPage.jsx";
import CommunityPage from "./pages/CommunityPage.jsx";
import LikesPage from "./pages/LikesPage.jsx";
import LibraryPage from "./pages/LibraryPage.jsx";
import VaultFeedPage from "./pages/VaultFeedPage.jsx";
import UserProfilePage from "./pages/UserProfilePage.jsx";
import StatsPage from "./pages/StatsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import MixesPage from "./pages/MixesPage.jsx";
import MixDetailPage from "./pages/MixDetailPage.jsx";
import PasswordResetPage from "./pages/PasswordResetPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import MessagesPage from "./pages/MessagesPage.jsx";
import MessageStartPage from "./pages/MessageStartPage.jsx";
import { FEATURE_DISCOVER, FEATURE_LETS_DJ, FEATURE_LIVE, FEATURE_STATS, FEATURE_TOP10, FEATURE_VAULT_FEED, signedInHomePath } from "./featureFlags.js";
import LetsDJPage from "./pages/LetsDJPage.jsx";

function AdminRoute() {
  const { auth } = useApp();
  if (auth.authLoading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--text2)", fontSize: 14 }}>
        Loading…
      </div>
    );
  }
  if (!auth.session?.user?.id) return <Navigate to="/" replace />;
  if (!auth.currentUser?.isAdmin) return <Navigate to={signedInHomePath()} replace />;
  return <AdminDashboardPage />;
}

function DiscoverRoute() {
  const { auth } = useApp();
  if (auth.authLoading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--text2)", fontSize: 14 }}>
        Loading…
      </div>
    );
  }
  if (!auth.session?.user?.id) return <Navigate to="/" replace />;
  return <DiscoverPage />;
}

function MixesRoute() {
  const { auth } = useApp();
  if (auth.authLoading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--text2)", fontSize: 14 }}>
        Loading…
      </div>
    );
  }
  if (!auth.session?.user?.id) return <Navigate to="/" replace />;
  return <MixesPage />;
}

function UploadRoute() {
  const { auth } = useApp();
  if (auth.authLoading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--text2)", fontSize: 14 }}>
        Loading…
      </div>
    );
  }
  if (!auth.session?.user?.id) return <Navigate to="/" replace />;
  if (!auth.currentUser?.isAdmin) return <Navigate to={signedInHomePath()} replace />;
  return <UploadPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/reset-password" element={<PasswordResetPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomeRoute />} />
        <Route
          path="/discover"
          element={FEATURE_DISCOVER ? <DiscoverRoute /> : <Navigate to={signedInHomePath()} replace />}
        />
        <Route path="/mixes" element={<MixesRoute />} />
        <Route
          path="/vault-feed"
          element={FEATURE_VAULT_FEED ? <VaultFeedPage /> : <Navigate to={signedInHomePath()} replace />}
        />
        <Route path="/foryou" element={<ForYouPage />} />
        <Route path="/live" element={FEATURE_LIVE ? <LiveRoute /> : <Navigate to="/" replace />} />
        <Route
          path="/top10"
          element={FEATURE_TOP10 ? <Top10Page /> : <Navigate to={signedInHomePath()} replace />}
        />
        <Route path="/upload" element={<UploadRoute />} />
        <Route path="/dj" element={FEATURE_LETS_DJ ? <LetsDJPage /> : <Navigate to="/" replace />} />
        <Route path="/mix/:id" element={<MixDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/likes" element={<LikesPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/to/:userId" element={<MessageStartPage />} />
        <Route path="/messages/:threadId" element={<MessagesPage />} />
        <Route path="/user/:userId" element={<UserProfilePage />} />
        <Route
          path="/stats"
          element={FEATURE_STATS ? <StatsPage /> : <Navigate to={signedInHomePath()} replace />}
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

