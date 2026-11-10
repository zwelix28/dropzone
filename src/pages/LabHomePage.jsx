import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import FloorFlyerLightbox from "../components/FloorFlyerLightbox.jsx";
import Icon from "../components/Icon.jsx";
import { GENRES } from "../constants/genres.js";
import { mixTitleBody } from "../constants/mixTitle.js";
import { handleArtworkError, resolveMixArtwork } from "../constants/artwork.js";
import { useApp } from "../context/AppContext.jsx";
import { getDjOfMonth } from "../lib/djOfMonth.js";
import {
  formatFloorEventPlace,
  formatFloorEventWhen,
  listFloorEventsForHome,
} from "../lib/floorEvents.js";
import { fmtDuration, fmtPlayerTime } from "../lib/format.js";
import { isMixesItem } from "../lib/contentType.js";
import useMediaQuery from "../hooks/useMediaQuery.js";
import { prefetchMixPlayback } from "../lib/audioUrls.js";
import { fetchLibrarySessions, getLibrarySessionsQuick } from "../lib/playbackProgress.js";

const CHIP_GENRES = ["All", ...GENRES.slice(0, 6)];

function shelfMixTitle(title) {
  return mixTitleBody(title) || title || "";
}

function artistName(episode, users) {
  if (!episode?.userId) return "Deep House Lab";
  return users.find((user) => user.id === episode.userId)?.username || "Deep House Lab";
}

function byNewest(a, b) {
  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
}

/** ISO-ish week key so Top 5 stays stable until the week rolls. */
function weekSeedKey(date = new Date()) {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNum = new Date(utc).getUTCDay() || 7;
  const thursday = new Date(utc);
  thursday.setUTCDate(new Date(utc).getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic shuffle for a given seed (mulberry32). */
function seededShuffle(items, seed) {
  const list = items.slice();
  let t = seed >>> 0;
  const rand = () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

/** Temporary Top 5: random weekly mix of the catalog until stream-based ranking lands. */
function pickTopFiveThisWeek(mixList) {
  if (!mixList.length) return [];
  const seed = hashSeed(`dhl-top5:${weekSeedKey()}`);
  return seededShuffle(mixList, seed).slice(0, 5);
}

function ShelfArt({ coverUrl }) {
  const src = resolveMixArtwork(coverUrl);
  return (
    <span className="lab-home-shelf-art">
      <span className="lab-home-crate-vinyl" aria-hidden="true">
        <span>
          <img src={src} alt="" onError={handleArtworkError} />
        </span>
      </span>
      <img className="lab-home-crate-cover" src={src} alt="" onError={handleArtworkError} />
    </span>
  );
}

function progressPct(positionSec, durationSec) {
  const dur = Number(durationSec) || 0;
  const pos = Number(positionSec) || 0;
  if (dur <= 0) return 0;
  return Math.min(99, Math.max(1, Math.round((pos / dur) * 100)));
}

export default function LabHomePage() {
  const { episodes, users, player, auth } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const chipsRef = useRef(null);
  const isDesktopHome = useMediaQuery("(min-width: 1080px)");
  const [genre, setGenre] = useState("All");

  useEffect(() => {
    if (!location.state?.resetHomeGenre) return;
    setGenre("All");
    const strip = chipsRef.current;
    if (strip) {
      strip.scrollTo({ left: 0, behavior: "smooth" });
    }
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate]);

  const mixes = useMemo(() => {
    return episodes
      .filter((episode) => isMixesItem(episode))
      .filter((episode) => genre === "All" || episode.genre === genre)
      .slice()
      .sort(byNewest);
  }, [episodes, genre]);

  // Temporary Top 5: weekly seeded shuffle until stream-based ranking.
  const top = useMemo(() => pickTopFiveThisWeek(mixes), [mixes]);

  const [djFeature, setDjFeature] = useState(null);
  const [floorEvents, setFloorEvents] = useState([]);
  const [floorPreview, setFloorPreview] = useState(null);
  const floorSliderRef = useRef(null);
  const userId = auth.session?.user?.id;
  const [sessions, setSessions] = useState(
    () => getLibrarySessionsQuick(auth.session?.user?.id, episodes),
  );
  const spinning = player.currentTrack && mixes.some((episode) => episode.id === player.currentTrack.id)
    ? mixes.find((episode) => episode.id === player.currentTrack.id)
    : mixes[0] || null;

  // Fresh crates: newest first — up to 10 so desktop can fill the shelf.
  const crates = mixes.slice(0, 10);
  const playingHero = Boolean(spinning && player.isPlaying && player.currentTrack?.id === spinning.id);

  const loadFloorEvents = useCallback(() => {
    listFloorEventsForHome({ limit: 8 }).then(({ rows }) => {
      setFloorEvents(rows || []);
    });
  }, []);

  useEffect(() => {
    let live = true;
    getDjOfMonth().then(({ row }) => {
      if (live) setDjFeature(row);
    });
    loadFloorEvents();
    return () => {
      live = false;
    };
  }, [loadFloorEvents]);

  // Refresh promotions when returning to Home (e.g. after promote / admin approve).
  useEffect(() => {
    if (location.pathname !== "/home") return;
    loadFloorEvents();
  }, [location.pathname, location.key, loadFloorEvents]);

  const scrollFloorSlider = (dir) => {
    const root = floorSliderRef.current;
    if (!root) return;
    const delta = Math.round(root.clientWidth * 0.85) * (dir < 0 ? -1 : 1);
    root.scrollBy({ left: delta, behavior: "smooth" });
  };

  useEffect(() => {
    if (!userId) {
      setSessions([]);
      return;
    }
    const quick = getLibrarySessionsQuick(userId, episodes);
    if (quick.length) setSessions(quick);
    let live = true;
    fetchLibrarySessions(userId, episodes).then((list) => {
      if (live) setSessions(list);
    });
    return () => {
      live = false;
    };
  }, [userId, episodes, player.isPlaying]);

  const djUser = djFeature ? users.find((user) => user.id === djFeature.profileId) : null;
  const djMix = djFeature ? episodes.find((episode) => episode.id === djFeature.mixId) : null;
  const playingDj = Boolean(djMix && player.isPlaying && player.currentTrack?.id === djMix.id);

  // Desktop Continue: 6 art-forward rail cards; mobile keeps a tighter stack of 4.
  const continueSessions = useMemo(
    () => sessions.slice(0, isDesktopHome ? 6 : 4),
    [sessions, isDesktopHome],
  );

  // Warm Continue listening (+ Now Spinning) near each resume point so play starts faster.
  useEffect(() => {
    if (!userId) return;
    const opts = { guestPreviewOnly: false, isAuthenticated: true, preferFullMix: false };
    const seen = new Set();
    if (spinning?.id && !seen.has(spinning.id)) {
      seen.add(spinning.id);
      void prefetchMixPlayback(spinning, opts);
    }
    for (const session of continueSessions.slice(0, 5)) {
      const episode = session?.episode;
      if (!episode?.id || seen.has(episode.id)) continue;
      seen.add(episode.id);
      void prefetchMixPlayback(episode, opts, {
        warm: true,
        seekSec: Number(session.positionSec) || 0,
      });
    }
  }, [userId, spinning?.id, continueSessions]);

  const openMix = (episode) => {
    navigate(`/mix/${episode.id}`, { state: { from: "/home" } });
  };

  return (
    <div className="lab-home fade-in">
      <div className="lab-home-chips" role="tablist" aria-label="Genres" ref={chipsRef}>
        {CHIP_GENRES.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={genre === name}
            className={`lab-home-chip${genre === name ? " is-on" : ""}`}
            onClick={(event) => {
              setGenre(name);
              event.currentTarget.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
            }}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="lab-home-layout">
        <div className="lab-home-main">
        <section className="lab-home-hero" aria-label="Now spinning">
          {spinning ? (
            <>
              <div className="lab-home-kicker">NOW SPINNING</div>
              <h1 className="lab-home-title" title={spinning.title}>
                {shelfMixTitle(spinning.title)}
              </h1>
              <p className="lab-home-meta">
                {artistName(spinning, users)} · {fmtPlayerTime(spinning.durationSecs)}
              </p>
              <button type="button" className="lab-home-play" onClick={() => void player.playTrack(spinning)}>
                {playingHero ? "Pause" : "Play mix"}
              </button>
              <div className="lab-home-vinyl" aria-hidden="true">
                <div className={`lab-home-vinyl-disc${playingHero ? " is-playing" : ""}`}>
                  <span>
                    <img src={resolveMixArtwork(spinning.coverUrl)} alt="" onError={handleArtworkError} />
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="lab-home-kicker">NOW SPINNING</div>
              <h1 className="lab-home-title">Nothing in this crate yet</h1>
              <p className="lab-home-meta">
                Try another genre, or open{" "}
                <Link to="/mixes" style={{ color: "var(--accent)", fontWeight: 600 }}>
                  Mixes
                </Link>
                .
              </p>
            </>
          )}
        </section>

        <div className="lab-home-shelves">
          <section className="lab-home-continue" aria-label="Continue listening">
            <h2 className="lab-home-sec">
              <span>Continue listening</span>
              <Link to="/library">Library</Link>
            </h2>
            {continueSessions.length === 0 ? (
              <p className="lab-home-empty">Start a mix and it will wait here so you can pick it up again.</p>
            ) : (
              <div
                className={`lab-home-shelf lab-home-continue-pane${isDesktopHome ? " is-desktop-rail" : ""}`}
              >
                {continueSessions.map((session) => {
                  const episode = session.episode;
                  const active = player.currentTrack?.id === episode.id;
                  const isPlaying = active && player.isPlaying;
                  const livePos =
                    active && Number(player.durationSec) > 0
                      ? (Number(player.progress) / 100) * Number(player.durationSec)
                      : session.positionSec;
                  const dur = (active && player.durationSec) || session.durationSec || episode.durationSecs || 0;
                  const leftSec = Math.max(0, Math.floor(Number(dur) || 0) - Math.floor(Number(livePos) || 0));
                  const pct = progressPct(livePos, dur);

                  if (isDesktopHome) {
                    return (
                      <button
                        key={session.mixId}
                        type="button"
                        className={`lab-home-continue-card${active ? " is-active" : ""}`}
                        title={episode.title}
                        onClick={() => void player.playTrack(episode)}
                      >
                        <span className="lab-home-continue-art">
                          <img
                            src={resolveMixArtwork(episode.coverUrl)}
                            alt=""
                            onError={handleArtworkError}
                          />
                          <span className="lab-home-continue-play" aria-hidden="true">
                            <Icon name={isPlaying ? "pause" : "play"} size={18} color="#07090F" />
                          </span>
                          <span className="lab-home-progress lab-home-continue-progress" aria-hidden="true">
                            <span style={{ width: `${pct}%` }} />
                          </span>
                        </span>
                        <span className="lab-home-continue-copy">
                          <b>{shelfMixTitle(episode.title)}</b>
                          <span className="sub">{artistName(episode, users)}</span>
                          <span className="lab-home-continue-left">
                            {leftSec > 0 ? `${fmtPlayerTime(leftSec)} left` : `${pct}%`}
                          </span>
                        </span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={session.mixId}
                      type="button"
                      className="lab-home-shelf-card"
                      title={episode.title}
                      onClick={() => void player.playTrack(episode)}
                    >
                      <ShelfArt coverUrl={episode.coverUrl} />
                      <span className="lab-home-continue-copy">
                        <b>{shelfMixTitle(episode.title)}</b>
                        <span className="sub">{artistName(episode, users)}</span>
                        <span className="lab-home-progress" aria-hidden="true">
                          <span style={{ width: `${pct}%` }} />
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section className="lab-home-crates-block" aria-label="Fresh crates">
          <h2 className="lab-home-sec">
            <span>Fresh crates</span>
            <Link to="/mixes">See all</Link>
          </h2>
          <div
            className={`lab-home-crates lab-home-crates-pane${isDesktopHome ? " is-desktop-rail" : ""}`}
          >
            {crates.map((episode) => {
              const active = player.currentTrack?.id === episode.id;
              const isPlaying = active && player.isPlaying;

              if (isDesktopHome) {
                return (
                  <button
                    key={episode.id}
                    type="button"
                    className={`lab-home-crate-card${active ? " is-active" : ""}`}
                    title={episode.title}
                    onClick={() => void player.playTrack(episode)}
                  >
                    <span className="lab-home-crate-art">
                      <img
                        src={resolveMixArtwork(episode.coverUrl)}
                        alt=""
                        onError={handleArtworkError}
                      />
                      <span className="lab-home-crate-play" aria-hidden="true">
                        <Icon name={isPlaying ? "pause" : "play"} size={18} color="#07090F" />
                      </span>
                    </span>
                    <span className="lab-home-crate-copy">
                      <b>{shelfMixTitle(episode.title)}</b>
                      <span className="sub">{artistName(episode, users)}</span>
                      <span className="lab-home-crate-meta">{fmtDuration(episode.durationSecs)}</span>
                    </span>
                  </button>
                );
              }

              return (
                <Link
                  key={episode.id}
                  className="lab-home-crate"
                  to={`/mix/${episode.id}`}
                  state={{ from: "/home" }}
                  title={episode.title}
                >
                  <div className="lab-home-crate-vinyl" aria-hidden="true">
                    <span>
                      <img src={resolveMixArtwork(episode.coverUrl)} alt="" onError={handleArtworkError} />
                    </span>
                  </div>
                  <img
                    className="lab-home-crate-cover"
                    src={resolveMixArtwork(episode.coverUrl)}
                    alt=""
                    onError={handleArtworkError}
                  />
                  <span className="lab-home-crate-copy">
                    <b>{shelfMixTitle(episode.title)}</b>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="lab-home-ranks" aria-label="Top 5 this week">
          <h2 className="lab-home-sec">
            <span>Top 5 this week</span>
          </h2>
          {top.length === 0 ? (
            <p className="lab-home-empty">Plays will rank mixes here.</p>
          ) : (
            <div className="lab-home-ranks-list">
              {top.map((episode, index) => (
                <button key={episode.id} type="button" className="lab-home-row" onClick={() => openMix(episode)}>
                  <span className="n">{index + 1}</span>
                  <span className="who">
                    <b>{shelfMixTitle(episode.title)}</b>
                    <span>{artistName(episode, users)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
        </div>

        {isDesktopHome && (djFeature || floorEvents.length > 0) ? (
          <div className="lab-home-rail">
            {djFeature ? (
              <aside className="lab-home-month" aria-label="DJ of the month">
                <h2 className="lab-home-sec">
                  <span>DJ of the month</span>
                </h2>
                <div className="lab-home-month-card">
                  <img
                    className="lab-home-month-art"
                    src={djFeature.photoUrl || "/logo.png"}
                    alt=""
                    onError={handleArtworkError}
                  />
                  <div className="lab-home-month-copy">
                    <h3 className="lab-home-month-title">{djUser?.username || "DJ"}</h3>
                    {djUser ? (
                      <Link className="lab-home-month-handle" to={`/user/${djUser.id}`}>
                        {djUser.handle}
                      </Link>
                    ) : null}
                    {djFeature.bio ? <p className="lab-home-month-bio">{djFeature.bio}</p> : null}
                    {djMix ? (
                      <div className="lab-home-month-mix">
                        <img src={resolveMixArtwork(djMix.coverUrl)} alt="" onError={handleArtworkError} />
                        <div>
                          <b>{djMix.title}</b>
                          <span>{fmtPlayerTime(djMix.durationSecs)}</span>
                        </div>
                        <button type="button" className="lab-home-play" onClick={() => void player.playTrack(djMix)}>
                          {playingDj ? "Pause" : "Play"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </aside>
            ) : null}

            {floorEvents.length > 0 ? (
              <aside className="lab-home-floor" aria-label="This week on the floor">
                <div className="lab-home-floor-head">
                  <h2 className="lab-home-sec">
                    <span>This week on the floor</span>
                  </h2>
                  {floorEvents.length > 1 ? (
                    <div className="lab-home-floor-nav">
                      <button
                        type="button"
                        className="lab-home-floor-nav-btn"
                        aria-label="Previous promotions"
                        onClick={() => scrollFloorSlider(-1)}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className="lab-home-floor-nav-btn"
                        aria-label="Next promotions"
                        onClick={() => scrollFloorSlider(1)}
                      >
                        ›
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="lab-home-floor-card">
                  <div className="lab-home-floor-slider" ref={floorSliderRef} role="list">
                    {floorEvents.map((event) => {
                      const place = formatFloorEventPlace(event.venue, event.city);
                      const when = formatFloorEventWhen(event.startsAt, event.endsAt);
                      const live = when === "Happening now";
                      return (
                        <button
                          key={event.id}
                          type="button"
                          role="listitem"
                          className={`lab-home-floor-slide${event.isFeatured ? " is-featured" : ""}${live ? " is-live" : ""}`}
                          aria-label={`View full flyer for ${event.title}`}
                          onClick={() => setFloorPreview(event)}
                        >
                          <span className="lab-home-floor-slide-art">
                            <img src={event.flyerUrl || "/logo.png"} alt="" onError={handleArtworkError} />
                            {live ? <span className="lab-home-floor-slide-badge is-live">Now</span> : null}
                            {!live && event.isFeatured ? (
                              <span className="lab-home-floor-slide-badge">Featured</span>
                            ) : null}
                          </span>
                          <span className="lab-home-floor-slide-copy">
                            <b>{event.title}</b>
                            {when ? <span>{when}</span> : null}
                            {place ? <span>{place}</span> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {floorEvents.length > 1 ? (
                    <p className="lab-home-floor-slider-hint">Swipe or use arrows to see more nights</p>
                  ) : null}
                  <p className="lab-home-floor-promote">
                    Promote a night?{" "}
                    <Link to="/on-the-floor">Get in touch</Link>
                  </p>
                </div>
              </aside>
            ) : null}
          </div>
        ) : null}
      </div>
      {floorPreview ? (
        <FloorFlyerLightbox event={floorPreview} onClose={() => setFloorPreview(null)} />
      ) : null}
    </div>
  );
}
