import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout.jsx";
import { useApp } from "./context/AppContext.jsx";
import HomeRoute from "./routes/HomeRoute.jsx";
import DiscoverPage from "./pages/DiscoverPage.jsx";
import LiveRoute from "./pages/LiveRoute.jsx";
import Top10Page from "./pages/Top10Page.jsx";
import UploadPage from "./pages/UploadPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import ConnectionsPage from "./pages/ConnectionsPage.jsx";
import LikesPage from "./pages/LikesPage.jsx";
import UserProfilePage from "./pages/UserProfilePage.jsx";
import StatsPage from "./pages/StatsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import MixDetailPage from "./pages/MixDetailPage.jsx";
import PasswordResetPage from "./pages/PasswordResetPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import MessagesPage from "./pages/MessagesPage.jsx";
import MessageStartPage from "./pages/MessageStartPage.jsx";
import { FEATURE_LETS_DJ } from "./featureFlags.js";
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
  if (!auth.currentUser?.isAdmin) return <Navigate to="/discover" replace />;
  return <AdminDashboardPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/reset-password" element={<PasswordResetPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/live" element={<LiveRoute />} />
        <Route path="/top10" element={<Top10Page />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/dj" element={FEATURE_LETS_DJ ? <LetsDJPage /> : <Navigate to="/" replace />} />
        <Route path="/mix/:id" element={<MixDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/likes" element={<LikesPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/to/:userId" element={<MessageStartPage />} />
        <Route path="/messages/:threadId" element={<MessagesPage />} />
        <Route path="/user/:userId" element={<UserProfilePage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin" element={<AdminRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

