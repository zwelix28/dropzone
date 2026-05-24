import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ForYouComments from "../components/ForYouComments.jsx";
import Icon from "../components/Icon.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import { useApp } from "../context/AppContext.jsx";
import useForYouPreview from "../hooks/useForYouPreview.js";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { episodeHasAudioSource, resolveMixDownloadUrl } from "../lib/audioUrls.js";
import { FOR_YOU_PREVIEW_SEC } from "../lib/forYouPreview.js";

function shuffleFeed(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildStableFeed(episodes, feedRef) {
  const playable = episodes.filter((ep) => episodeHasAudioSource(ep));
  if (playable.length === 0) {
    feedRef.current = [];
    return [];
  }
  if (!feedRef.current?.length) {
    feedRef.current = shuffleFeed(playable);
    return feedRef.current;
  }
  const known = new Set(feedRef.current.map((e) => e.id));
  const fresh = playable.filter((e) => !known.has(e.id));
  if (fresh.length) {
    feedRef.current = [...feedRef.current, ...shuffleFeed(fresh)];
  }
  const playableIds = new Set(playable.map((e) => e.id));
  feedRef.current = feedRef.current.filter((e) => playableIds.has(e.id));
  return feedRef.current;
}

function ActionButton({ label, onClick, children, active = false }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        background: "none",
        color: active ? "#f87171" : "#fff",
        cursor: "pointer",
        minWidth: 52,
        touchAction: "manipulation",
      }}
    >
      <span
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "rgba(7,9,15,0.55)",
          border: "1px solid rgba(255,255,255,0.14)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </span>
    </button>
  );
}

export default function ForYouPage() {
  const { auth, episodes, users, likedMixIds, toggleLike, trackEvent } = useApp();
  const navigate = useNavigate();
  const isCompact = useMediaQuery("(max-width: 720px)");
  const containerRef = useRef(null);
  const slideRefs = useRef([]);
  const feedRef = useRef(null);
  const scrollSyncTimer = useRef(null);
  const programmaticScrollRef = useRef(false);
  const advancedRef = useRef(null);
  const lastPlayedIdRef = useRef(null);
  const feedReadyRef = useRef(false);
  const autoplayPendingRef = useRef(null);

  const [index, setIndex] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [toast, setToast] = useState("");

  const isAuthenticated = Boolean(auth.session?.user?.id);
  const preview = useForYouPreview({ isAuthenticated });
  const playPreviewRef = useRef(preview.playPreview);
  playPreviewRef.current = preview.playPreview;
  const prefetchRef = useRef(preview.prefetch);
  prefetchRef.current = preview.prefetch;

  const feed = useMemo(() => buildStableFeed(episodes, feedRef), [episodes]);

  const current = feed[index] || null;
  const currentUser = current ? users.find((u) => u.id === current.userId) : null;
  const liked = Boolean(current && likedMixIds.includes(current.id));
  const isCurrentPlaying = Boolean(current && preview.track?.id === current.id && preview.isPlaying);

  const syncIndexFromScroll = useCallback(() => {
    const root = containerRef.current;
    if (!root || programmaticScrollRef.current) return;
    const viewportMid = root.scrollTop + root.clientHeight * 0.5;
    let bestIdx = 0;
    let bestDist = Infinity;
    slideRefs.current.forEach((el, i) => {
      if (!el) return;
      const slideMid = el.offsetTop + el.clientHeight * 0.5;
      const dist = Math.abs(viewportMid - slideMid);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });
    setIndex((prev) => (prev === bestIdx ? prev : bestIdx));
  }, []);

  const scrollToIndex = useCallback((nextIndex, behavior = "smooth") => {
    const clamped = Math.max(0, Math.min(feed.length - 1, nextIndex));
    programmaticScrollRef.current = true;
    setIndex(clamped);
    const el = slideRefs.current[clamped];
    if (el) el.scrollIntoView({ behavior, block: "start" });
    window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, behavior === "smooth" ? 420 : 0);
  }, [feed.length]);

  const startPreview = useCallback(
    async (track) => {
      if (!track?.id) return false;
      const started = await playPreviewRef.current(track, { force: true });
      if (started) {
        lastPlayedIdRef.current = track.id;
        autoplayPendingRef.current = null;
        void trackEvent({ kind: "play", episodeId: track.id, actorUserId: auth.currentUser?.id });
        const list = feedRef.current || [];
        const idx = list.findIndex((e) => e.id === track.id);
        prefetchRef.current(list[idx + 1]);
        prefetchRef.current(list[idx - 1]);
        return true;
      }
      autoplayPendingRef.current = track.id;
      return false;
    },
    [trackEvent, auth.currentUser?.id],
  );

  useEffect(() => {
    lastPlayedIdRef.current = null;
    feedReadyRef.current = false;
    autoplayPendingRef.current = null;
  }, []);

  useEffect(() => {
    if (feed.length === 0) return;
    if (!feedReadyRef.current) {
      feedReadyRef.current = true;
      lastPlayedIdRef.current = null;
      prefetchRef.current(feed[0]);
    }
  }, [feed]);

  useLayoutEffect(() => {
    const track = feed[index];
    if (!track?.id || lastPlayedIdRef.current === track.id) return;
    void startPreview(track);
  }, [current?.id, index, startPreview]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const retryAutoplay = () => {
      const pendingId = autoplayPendingRef.current;
      if (!pendingId) return;
      const track =
        feedRef.current?.find((e) => e.id === pendingId) ||
        feedRef.current?.[index] ||
        feedRef.current?.[0];
      if (!track?.id) return;
      lastPlayedIdRef.current = null;
      void startPreview(track);
    };

    root.addEventListener("pointerdown", retryAutoplay);
    return () => root.removeEventListener("pointerdown", retryAutoplay);
  }, [index, startPreview]);

  useEffect(() => {
    if (!current || preview.track?.id !== current.id) return;
    if (preview.progress < 99) {
      advancedRef.current = null;
      return;
    }
    if (advancedRef.current === current.id) return;
    advancedRef.current = current.id;
    if (index < feed.length - 1) scrollToIndex(index + 1);
  }, [preview.progress, preview.track?.id, current, index, feed.length, scrollToIndex]);

  useEffect(() => () => preview.stop(), [preview.stop]);

  useEffect(() => {
    if (index >= feed.length && feed.length > 0) {
      setIndex(feed.length - 1);
    }
  }, [index, feed.length]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const syncSlideHeights = () => {
      const h = root.clientHeight;
      if (h <= 0) return;
      slideRefs.current.forEach((el) => {
        if (el) el.style.height = `${h}px`;
      });
    };

    syncSlideHeights();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncSlideHeights) : null;
    ro?.observe(root);
    window.addEventListener("resize", syncSlideHeights);

    const onScroll = () => {
      if (programmaticScrollRef.current) return;
      window.clearTimeout(scrollSyncTimer.current);
      scrollSyncTimer.current = window.setTimeout(syncIndexFromScroll, 80);
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    const onScrollEnd = () => syncIndexFromScroll();
    root.addEventListener("scrollend", onScrollEnd);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", syncSlideHeights);
      root.removeEventListener("scroll", onScroll);
      root.removeEventListener("scrollend", onScrollEnd);
      window.clearTimeout(scrollSyncTimer.current);
    };
  }, [syncIndexFromScroll, feed.length]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const handleLike = () => {
    if (!current) return;
    if (!auth.session?.user?.id) {
      auth.setShowAuth(true);
      return;
    }
    void toggleLike(current.id);
  };

  const handleShare = async () => {
    if (!current) return;
    const shareUrl = `${window.location.origin}/mix/${current.id}`;
    const payload = {
      title: current.title || "Mix",
      text: currentUser ? `${current.title} — ${currentUser.username}` : current.title,
      url: shareUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(payload);
      } catch {
        // ignore cancel
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setToast("Link copied");
      } catch {
        setToast("Could not copy link");
      }
    }
    void trackEvent({ kind: "share", episodeId: current.id, actorUserId: auth.currentUser?.id });
  };

  const promptGuestAuth = (action) => {
    setToast(`Sign in or create an account to ${action}`);
    auth.setShowAuth(true);
  };

  const handleDownload = async () => {
    if (!current) return;
    if (!auth.session?.user?.id) {
      promptGuestAuth("download mixes");
      return;
    }
    if (!liked) {
      setToast("Like this mix to unlock download");
      return;
    }
    const url = await resolveMixDownloadUrl(current, current.title);
    if (!url) {
      setToast("Download unavailable");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    a.target = "_blank";
    a.download = `${(current.title || "mix").replace(/[^\w\s-]/g, "").trim()}.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setToast("Downloading full mix…");
    void trackEvent({ kind: "download", episodeId: current.id, actorUserId: auth.currentUser?.id });
  };

  if (feed.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--text2)" }}>
        <Icon name="music" size={40} color="var(--text3)" />
        <p style={{ marginTop: 16 }}>No mixes available for For You yet.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: isCompact ? 1 : undefined,
        minHeight: isCompact ? 0 : undefined,
        height: isCompact ? "100%" : "calc(100vh - 60px)",
        overflow: "hidden",
        position: "relative",
        background: "#07090f",
      }}
    >
      <div ref={containerRef} className="for-you-feed">
        {feed.map((ep, i) => {
          const artist = users.find((u) => u.id === ep.userId);
          const cover = ep.coverUrl?.trim();
          const isActive = i === index;
          const showProgress = isActive && preview.track?.id === ep.id;

          return (
            <section
              key={ep.id}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              data-index={i}
              style={{
                scrollSnapAlign: "start",
                scrollSnapStop: "always",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
                boxSizing: "border-box",
              }}
            >
              {cover ? (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: "-10%",
                    backgroundImage: `url(${cover})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "blur(42px) saturate(1.1)",
                    opacity: isActive ? 0.5 : 0.35,
                    transform: "scale(1.08)",
                    transition: "opacity 0.25s ease",
                  }}
                />
              ) : null}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(180deg, rgba(7,9,15,0.35) 0%, rgba(7,9,15,0.75) 55%, #07090f 100%)",
                }}
              />

              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  width: "100%",
                  maxWidth: isCompact ? "100%" : 720,
                  padding: isCompact ? "20px 72px 28px 16px" : "24px 120px 32px 32px",
                }}
              >
                <div
                  style={{
                    width: isCompact ? "min(68vw, 260px)" : 300,
                    aspectRatio: "1",
                    borderRadius: 16,
                    overflow: "hidden",
                    boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    marginBottom: 18,
                    marginLeft: isCompact ? "auto" : undefined,
                    marginRight: isCompact ? "auto" : undefined,
                  }}
                >
                  {cover ? (
                    <img src={cover} alt={ep.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "var(--surface)",
                      }}
                    >
                      <Icon name="music" size={48} color="var(--text3)" />
                    </div>
                  )}
                </div>

                <div style={{ maxWidth: isCompact ? "min(68vw, 300px)" : 420 }}>
                  <h2
                    style={{
                      fontFamily: "var(--ff-display)",
                      fontSize: isCompact ? 22 : 28,
                      letterSpacing: "0.03em",
                      lineHeight: 1.1,
                      margin: "0 0 8px",
                    }}
                  >
                    {ep.title}
                  </h2>
                  {artist ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/user/${artist.id}`)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        background: "none",
                        color: "var(--accent)",
                        fontWeight: 600,
                        fontSize: 15,
                        marginBottom: 8,
                      }}
                    >
                      <UserAvatar user={artist} size={28} showVerified={false} />
                      <span>{artist.username}</span>
                      {artist.verified ? <VerifiedBadge size={14} /> : null}
                    </button>
                  ) : null}
                  {ep.description ? (
                    <p
                      style={{
                        color: "var(--text2)",
                        fontSize: 13,
                        lineHeight: 1.45,
                        margin: "0 0 10px",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {ep.description}
                    </p>
                  ) : null}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {ep.genre ? (
                      <span className="tag tag-blue" style={{ fontSize: 11 }}>
                        {ep.genre}
                      </span>
                    ) : null}
                    <span style={{ fontSize: 11, color: "var(--text3)", letterSpacing: "0.06em" }}>
                      Preview from 2:30 · {FOR_YOU_PREVIEW_SEC}s
                    </span>
                  </div>

                  {showProgress ? (
                    <div style={{ marginTop: 14, maxWidth: isCompact ? "100%" : 320 }}>
                      <div className="progress-wrap" style={{ height: 4 }}>
                        <div className="progress-fill" style={{ width: `${preview.progress}%`, height: "100%" }} />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: 6,
                          fontSize: 11,
                          color: "var(--text3)",
                        }}
                      >
                        <span>Preview</span>
                        <span>{Math.round(preview.progress)}%</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <p
                style={{
                  position: "absolute",
                  bottom: 16,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.45)",
                  letterSpacing: "0.08em",
                  zIndex: 2,
                  margin: 0,
                  pointerEvents: "none",
                }}
              >
                SWIPE UP · NEXT MIX
              </p>
            </section>
          );
        })}
      </div>

      {current ? (
        <div
          style={{
            position: "absolute",
            right: isCompact ? 10 : 24,
            bottom: isCompact ? 103 : 88,
            zIndex: 5,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <ActionButton
            label={currentUser ? `Open ${currentUser.username}'s profile` : "Artist profile"}
            onClick={() => currentUser && navigate(`/user/${currentUser.id}`)}
          >
            <UserAvatar user={currentUser} size={32} showVerified={false} />
          </ActionButton>

          <ActionButton label={liked ? "Unlike" : "Like"} active={liked} onClick={handleLike}>
            <Icon name="heart" size={22} color={liked ? "#f87171" : "#fff"} />
          </ActionButton>

          <ActionButton
            label="Comments"
            onClick={() => {
              if (!auth.session?.user?.id) {
                promptGuestAuth("comment");
                return;
              }
              setCommentsOpen(true);
            }}
          >
            <Icon name="comment" size={22} color="#fff" />
          </ActionButton>

          <ActionButton label="Share" onClick={() => void handleShare()}>
            <Icon name="share" size={20} color="#fff" />
          </ActionButton>

          <ActionButton
            label={liked ? "Download full mix" : "Like to download"}
            onClick={() => void handleDownload()}
          >
            <Icon name="download" size={20} color="#fff" />
          </ActionButton>

          {!isCompact ? (
            <ActionButton
              label={isCurrentPlaying ? "Pause preview" : "Play preview"}
              onClick={() => void preview.toggle()}
            >
              <Icon name={isCurrentPlaying ? "pause" : "play"} size={20} color="#fff" />
            </ActionButton>
          ) : null}
        </div>
      ) : null}

      {toast ? (
        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(17,24,39,0.92)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 16px",
            fontSize: 13,
            zIndex: 20,
            whiteSpace: "nowrap",
          }}
        >
          {toast}
        </div>
      ) : null}

      <ForYouComments
        mixId={current?.id}
        mixTitle={current?.title}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
      />
    </div>
  );
}
