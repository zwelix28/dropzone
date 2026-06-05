import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import AuthModal from "../components/AuthModal.jsx";
import DesktopNowPlaying from "../components/DesktopNowPlaying.jsx";
import MobileNowPlaying from "../components/MobileNowPlaying.jsx";
import PlayerBar from "../components/PlayerBar.jsx";
import Sidebar, { DESKTOP_SIDEBAR_WIDTH } from "../components/Sidebar.jsx";
import TopBar from "../components/TopBar.jsx";
import { useApp } from "../context/AppContext.jsx";
import { FontLoader, GlobalStyles } from "../styles/GlobalStyles.jsx";
import NotificationsPanel from "../components/NotificationsPanel.jsx";
import useMediaQuery from "../hooks/useMediaQuery.js";

export default function AppLayout() {
  const { auth, player, users, notificationsByUser, markAllRead, markRead, refreshNotifications, dmUnreadCount } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [mobileFullPlayerOpen, setMobileFullPlayerOpen] = useState(false);
  const [desktopExpandedPlayerOpen, setDesktopExpandedPlayerOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 720px)");
  const location = useLocation();
  const registeredMobile = Boolean(isMobile && auth.session?.user?.id);
  const showMobileFullPlayer =
    registeredMobile && mobileFullPlayerOpen && Boolean(player.currentTrack);
  const showMobileBottomBar =
    isMobile && auth.session?.user?.id && player.currentTrack && !mobileFullPlayerOpen;
  const showDesktopExpandedPlayer =
    !isMobile && desktopExpandedPlayerOpen && Boolean(player.currentTrack);
  const isForYou = location.pathname === "/foryou";
  const showCompactPlayerBar =
    !isForYou &&
    Boolean(player.currentTrack) &&
    (!isMobile || !auth.session?.user?.id || !mobileFullPlayerOpen);

  const notifications = useMemo(() => {
    const uid = auth.currentUser?.id;
    return uid ? notificationsByUser[uid] || [] : [];
  }, [auth.currentUser?.id, notificationsByUser]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile || !navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobile, navOpen]);

  useEffect(() => {
    if (!registeredMobile) {
      setMobileFullPlayerOpen(false);
      return;
    }
    if (!player.currentTrack?.id) {
      setMobileFullPlayerOpen(false);
    }
  }, [registeredMobile, player.currentTrack?.id]);

  useEffect(() => {
    if (!player.currentTrack?.id) {
      setDesktopExpandedPlayerOpen(false);
    }
  }, [player.currentTrack?.id]);

  useEffect(() => {
    if (!showMobileFullPlayer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showMobileFullPlayer]);

  const mainBottomPad = isForYou
    ? 0
    : isMobile
      ? showMobileBottomBar
        ? 118
        : 24
      : player.currentTrack
        ? 96
        : 0;

  return (
    <>
      <FontLoader />
      <GlobalStyles />

      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          height: isMobile ? (isForYou ? "100dvh" : "auto") : "100vh",
          overflow: isMobile && isForYou ? "hidden" : isMobile ? "visible" : "hidden",
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        {!isMobile ? (
          <Sidebar
            currentUser={auth.currentUser}
            onLogout={() => auth.signOut()}
            onLogin={() => auth.setShowAuth(true)}
            variant="desktop"
          />
        ) : null}

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
            marginLeft: isMobile ? 0 : DESKTOP_SIDEBAR_WIDTH,
            height: isMobile ? (isForYou ? "100dvh" : "auto") : "100vh",
            minHeight: isMobile && isForYou ? "100dvh" : undefined,
            isolation: isMobile && isForYou ? "isolate" : undefined,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              position: "relative",
              zIndex: isMobile && isForYou ? 120 : undefined,
              width: "100%",
            }}
          >
            <TopBar
              currentUser={auth.currentUser}
              onLogin={() => auth.setShowAuth(true)}
              unreadCount={unreadCount}
              showMenuButton={isMobile}
              onMenuClick={() => setNavOpen(true)}
              pinHeader={isMobile && isForYou}
              onToggleNotifications={() => {
                setShowNotifications((v) => {
                  const next = !v;
                  if (next && auth.currentUser) void refreshNotifications();
                  return next;
                });
              }}
            />
          </div>
          <main
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: isForYou ? "hidden" : "auto",
              overflowX: "hidden",
              paddingBottom: mainBottomPad,
              WebkitOverflowScrolling: "touch",
              display: isForYou ? "flex" : "block",
              flexDirection: isForYou ? "column" : undefined,
              position: "relative",
              zIndex: isMobile && isForYou ? 0 : undefined,
            }}
          >
            <Outlet />
          </main>
        </div>
      </div>

      {isMobile ? (
        <>
          <div
            role="presentation"
            className={`mobile-nav-backdrop ${navOpen ? "visible" : "hidden"}`}
            onClick={() => setNavOpen(false)}
          />
          <div className={`mobile-nav-drawer ${navOpen ? "open" : "closed"}`}>
            <Sidebar
              currentUser={auth.currentUser}
              onLogout={() => auth.signOut()}
              onLogin={() => auth.setShowAuth(true)}
              variant="drawer"
              onClose={() => setNavOpen(false)}
              dmUnreadCount={dmUnreadCount}
            />
          </div>
        </>
      ) : null}

      {showDesktopExpandedPlayer ? (
        <DesktopNowPlaying
          track={player.currentTrack}
          user={users.find((u) => u.id === player.currentTrack?.userId)}
          isPlaying={player.isPlaying}
          progress={player.progress}
          durationSec={player.durationSec}
          volume={player.volume}
          onClose={() => setDesktopExpandedPlayerOpen(false)}
          onToggle={() => player.toggle()}
          onSeek={player.seek}
          onNext={() => void player.playNext()}
          onPrev={() => void player.playPrev()}
          onVolume={player.setVolume}
          shuffleOn={player.shuffleOn}
          onToggleShuffle={player.toggleShuffle}
        />
      ) : null}

      {showMobileFullPlayer ? (
        <MobileNowPlaying
          track={player.currentTrack}
          user={users.find((u) => u.id === player.currentTrack?.userId)}
          isPlaying={player.isPlaying}
          progress={player.progress}
          durationSec={player.durationSec}
          guestPreviewOnly={player.guestPreviewOnly}
          onClose={() => setMobileFullPlayerOpen(false)}
          onToggle={() => player.toggle()}
          onSeek={player.seek}
          onPrev={() => void player.playPrev()}
          onNext={() => void player.playNext()}
          shuffleOn={player.shuffleOn}
          onToggleShuffle={player.toggleShuffle}
        />
      ) : null}

      {showCompactPlayerBar ? (
        <PlayerBar
          track={player.currentTrack}
          users={users}
          isPlaying={player.isPlaying}
          onToggle={() => player.toggle()}
          progress={player.progress}
          durationSec={player.durationSec}
          onSeek={player.seek}
          volume={player.volume}
          onVolume={player.setVolume}
          onPrev={() => void player.playPrev()}
          onNext={() => void player.playNext()}
          shuffleOn={player.shuffleOn}
          onToggleShuffle={player.toggleShuffle}
          onExpandFullPlayer={
            player.currentTrack
              ? () => {
                  if (isMobile) setMobileFullPlayerOpen(true);
                  else setDesktopExpandedPlayerOpen(true);
                }
              : undefined
          }
        />
      ) : null}

      {auth.showAuth && <AuthModal onClose={() => auth.setShowAuth(false)} />}

      {showNotifications && auth.currentUser ? (
        <NotificationsPanel
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkAllRead={() => markAllRead()}
          onMarkRead={(id) => markRead(id)}
          isMobile={isMobile}
        />
      ) : null}
    </>
  );
}
