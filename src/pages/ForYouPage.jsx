import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ForYouComments from "../components/ForYouComments.jsx";
import Icon from "../components/Icon.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import { useApp } from "../context/AppContext.jsx";
import useForYouPreview from "../hooks/useForYouPreview.js";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { episodeHasAudioSource } from "../lib/audioUrls.js";
import { downloadMixWithMetadata } from "../lib/downloadMixWithMetadata.js";

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

function ActionButton({ label, onClick, children, active = false, compact = false }) {
  const iconSize = compact ? 40 : 48;
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
        gap: compact ? 0 : 6,
        background: "none",
        color: active ? "#f87171" : "#fff",
        cursor: "pointer",
        minWidth: compact ? 40 : 52,
        touchAction: "manipulation",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: "50%",
          background: compact ? "rgba(7,9,15,0.4)" : "rgba(7,9,15,0.55)",
          border: compact ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.14)",
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
  const tapGestureRef = useRef({ x: 0, y: 0, moved: false });

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
    }, behavior === "smooth" ? 280 : 0);
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

  const togglePreviewForSlide = useCallback(
    (ep) => {
      if (!ep?.id) return;
      if (preview.track?.id === ep.id) {
        void preview.toggle();
      } else {
        lastPlayedIdRef.current = null;
        void startPreview(ep);
      }
    },
    [preview, startPreview],
  );

  const onSlidePointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    tapGestureRef.current = { x: e.clientX, y: e.clientY, moved: false };
  };

  const onSlidePointerMove = (e) => {
    const g = tapGestureRef.current;
    if (g.moved) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (dx * dx + dy * dy > 100) g.moved = true;
  };

  const onSlidePointerUp = (e, ep, isActive) => {
    if (!isActive) return;
    if (e.target.closest("button, a, input, textarea, [data-foryou-no-toggle]")) return;
    if (tapGestureRef.current.moved) return;
    togglePreviewForSlide(ep);
  };

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
      prefetchRef.current(feed[1]);
    }
  }, [feed]);

  useEffect(() => {
    if (feed.length === 0) return;
    prefetchRef.current(feed[index]);
    prefetchRef.current(feed[index + 1]);
    prefetchRef.current(feed[index - 1]);
  }, [index, feed]);

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
    if (!root || feed.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (programmaticScrollRef.current) return;
        let bestIdx = null;
        let bestRatio = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const ratio = entry.intersectionRatio;
          if (ratio < 0.5) continue;
          const idx = Number(entry.target.getAttribute("data-index"));
          if (Number.isNaN(idx)) continue;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIdx = idx;
          }
        }
        if (bestIdx != null) {
          setIndex((prev) => (prev === bestIdx ? prev : bestIdx));
        }
      },
      { root, threshold: [0.5, 0.6, 0.7, 0.85] },
    );

    slideRefs.current.forEach((el) => {
      if (el) io.observe(el);
    });

    return () => io.disconnect();
  }, [feed.length]);

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
      scrollSyncTimer.current = window.setTimeout(syncIndexFromScroll, 50);
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    const onScrollEnd = () => {
      if (programmaticScrollRef.current) return;
      window.clearTimeout(scrollSyncTimer.current);
      syncIndexFromScroll();
    };
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
    setToast("Preparing download…");
    const { ok } = await downloadMixWithMetadata(current, { artist: currentUser });
    if (!ok) {
      setToast("Download unavailable");
      return;
    }
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
        zIndex: 0,
        background: isCompact ? "rgba(7,9,15,0.85)" : "#07090f",
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
              onPointerDown={onSlidePointerDown}
              onPointerMove={onSlidePointerMove}
              onPointerUp={(e) => onSlidePointerUp(e, ep, isActive)}
              onPointerCancel={() => {
                tapGestureRef.current.moved = true;
              }}
              style={{
                scrollSnapAlign: "start",
                scrollSnapStop: "always",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: isCompact ? "stretch" : "center",
                justifyContent: isCompact ? "stretch" : "center",
                overflow: "hidden",
                flexShrink: 0,
                boxSizing: "border-box",
                isolation: "isolate",
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
                    opacity: isActive ? (isCompact ? 0.35 : 0.5) : isCompact ? 0.2 : 0.35,
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
                  background: isCompact
                    ? "linear-gradient(180deg, rgba(7,9,15,0.2) 0%, rgba(7,9,15,0.6) 55%, rgba(7,9,15,0.88) 100%)"
                    : "linear-gradient(180deg, rgba(7,9,15,0.35) 0%, rgba(7,9,15,0.75) 55%, #07090f 100%)",
                }}
              />

              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  width: "100%",
                  height: isCompact ? "100%" : undefined,
                  maxWidth: isCompact ? "100%" : 420,
                  margin: isCompact ? undefined : "0 auto",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: isCompact ? "flex-start" : "center",
                  padding: isCompact ? "17px 16px 52px" : "24px 32px 48px",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: isCompact ? "100%" : 300,
                    maxWidth: isCompact ? 300 : undefined,
                    aspectRatio: "1",
                    borderRadius: 16,
                    overflow: "hidden",
                    boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    marginBottom: isCompact ? 45 : 18,
                    flexShrink: 0,
                  }}
                >
                  {cover ? (
                    <img src={cover} alt={ep.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
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

                <div
                  style={{
                    width: "100%",
                    maxWidth: isCompact ? 300 : 420,
                    textAlign: "center",
                  }}
                >
                  <h2
                    style={{
                      fontFamily: "var(--ff-display)",
                      fontSize: isCompact ? 20 : 28,
                      letterSpacing: "0.03em",
                      lineHeight: 1.15,
                      margin: isCompact ? "0 0 13px" : "0 0 8px",
                      display: isCompact ? "-webkit-box" : undefined,
                      WebkitLineClamp: isCompact ? 2 : undefined,
                      WebkitBoxOrient: isCompact ? "vertical" : undefined,
                      overflow: isCompact ? "hidden" : undefined,
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
                        justifyContent: "center",
                        gap: 8,
                        background: "none",
                        color: "var(--accent)",
                        fontWeight: 600,
                        fontSize: 15,
                        marginBottom: 8,
                        maxWidth: "100%",
                        width: isCompact ? undefined : "100%",
                      }}
                    >
                      <UserAvatar user={artist} size={28} showVerified={false} />
                      <span>{artist.username}</span>
                      {artist.verified ? <VerifiedBadge size={14} /> : null}
                    </button>
                  ) : null}
                  {!isCompact && ep.description ? (
                    <p
                      style={{
                        color: "var(--text2)",
                        fontSize: 13,
                        lineHeight: 1.45,
                        margin: "0 0 10px",
                        textAlign: "center",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {ep.description}
                    </p>
                  ) : null}
                  {ep.genre ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span className="tag tag-blue" style={{ fontSize: 11 }}>
                        {ep.genre}
                      </span>
                    </div>
                  ) : null}

                  {isCompact && isActive ? (
                    <div style={{ marginTop: 12, width: "100%" }}>
                      <div className="progress-wrap" style={{ height: 4 }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${showProgress ? preview.progress : 0}%`,
                            height: "100%",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 10,
                          marginTop: 22,
                          flexWrap: "nowrap",
                          width: "100%",
                        }}
                      >
                        <ActionButton
                          compact
                          label={artist ? `Open ${artist.username}'s profile` : "Artist profile"}
                          onClick={() => artist && navigate(`/user/${artist.id}`)}
                        >
                          <UserAvatar user={artist} size={26} showVerified={false} />
                        </ActionButton>
                        <ActionButton
                          compact
                          label={likedMixIds.includes(ep.id) ? "Unlike" : "Like"}
                          active={likedMixIds.includes(ep.id)}
                          onClick={handleLike}
                        >
                          <Icon
                            name="heart"
                            size={20}
                            color={likedMixIds.includes(ep.id) ? "#f87171" : "#fff"}
                          />
                        </ActionButton>
                        <ActionButton
                          compact
                          label="Comments"
                          onClick={() => {
                            if (!auth.session?.user?.id) {
                              promptGuestAuth("comment");
                              return;
                            }
                            setCommentsOpen(true);
                          }}
                        >
                          <Icon name="comment" size={20} color="#fff" />
                        </ActionButton>
                        <ActionButton compact label="Share" onClick={() => void handleShare()}>
                          <Icon name="share" size={18} color="#fff" />
                        </ActionButton>
                        <ActionButton
                          compact
                          label={likedMixIds.includes(ep.id) ? "Download full mix" : "Like to download"}
                          onClick={() => void handleDownload()}
                        >
                          <Icon name="download" size={18} color="#fff" />
                        </ActionButton>
                      </div>
                    </div>
                  ) : showProgress ? (
                    <div style={{ marginTop: 14, width: "100%", maxWidth: 320 }}>
                      <div className="progress-wrap" style={{ height: 4 }}>
                        <div className="progress-fill" style={{ width: `${preview.progress}%`, height: "100%" }} />
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
                  color: isCompact ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.45)",
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

      {current && !isCompact ? (
        <div
          style={{
            position: "absolute",
            right: 24,
            bottom: 88,
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
