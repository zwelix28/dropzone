import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import useAuth from "../hooks/useAuth.js";
import usePlayer from "../hooks/usePlayer.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";
import { mixRowToEpisode, notificationRowToApp, profileRowToUser } from "../lib/maps.js";

const AppContext = createContext(null);

const MILESTONES = [10, 50, 100, 250, 500, 1000, 5000, 10000, 50000, 100000];

function nextMilestoneHit(value, lastNotified) {
  const v = Number(value || 0);
  const last = Number(lastNotified || 0);
  for (const m of MILESTONES) {
    if (m > last && v >= m) return m;
  }
  return null;
}

export function AppProvider({ children }) {
  const auth = useAuth();
  const episodesRef = useRef([]);
  const getPlaylist = useCallback(() => episodesRef.current, []);

  const player = usePlayer({
    guestPreviewOnly: !auth.session?.user?.id,
    isAuthenticated: Boolean(auth.session?.user?.id),
    getPlaylist,
  });

  const [episodes, setEpisodes] = useState([]);
  episodesRef.current = episodes;
  const [users, setUsers] = useState([]);
  const [liveStreams] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const notificationsRef = useRef([]);
  notificationsRef.current = notifications;
  const [likedMixIds, setLikedMixIds] = useState([]);
  const [dataError, setDataError] = useState(null);
  const [dmUnreadCount, setDmUnreadCount] = useState(0);

  const top10NotifiedRef = useRef(new Set());
  const milestoneRef = useRef(new Map());

  const refreshMixes = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setEpisodes([]);
      return [];
    }
    const { data, error } = await supabase.from("mixes").select("*").order("created_at", { ascending: false });
    if (error) {
      setDataError(error.message);
      return [];
    }
    setDataError(null);
    const list = (data || []).map(mixRowToEpisode);
    setEpisodes(list);
    return list;
  }, []);

  const refreshProfiles = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setUsers([]);
      return [];
    }
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) {
      setDataError(error.message);
      return [];
    }
    const list = (data || []).map(profileRowToUser).filter(Boolean);
    setUsers(list);
    return list;
  }, []);

  const refreshNotifications = useCallback(async () => {
    const uid = auth.session?.user?.id;
    if (!isSupabaseConfigured() || !uid) {
      setNotifications([]);
      return;
    }
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return;
    const fromDb = (data || []).map(notificationRowToApp).filter(Boolean);
    setNotifications((prev) => {
      const locals = prev.filter((x) => String(x.id).startsWith("local_"));
      return [...locals, ...fromDb].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
    });
  }, [auth.session?.user?.id]);

  const refreshDmUnreadCount = useCallback(async () => {
    const uid = auth.session?.user?.id;
    if (!isSupabaseConfigured() || !uid) {
      setDmUnreadCount(0);
      return;
    }
    const { data, error } = await supabase.rpc("dm_unread_count");
    if (error) {
      setDmUnreadCount(0);
      return;
    }
    const n = typeof data === "number" ? data : Number(data);
    setDmUnreadCount(Number.isFinite(n) ? n : 0);
  }, [auth.session?.user?.id]);

  const markDmThreadRead = useCallback(
    async (threadId) => {
      if (!isSupabaseConfigured() || !threadId) return;
      const { error } = await supabase.rpc("mark_dm_thread_read", { p_thread_id: threadId });
      if (error) console.warn("mark_dm_thread_read", error.message);
      await refreshDmUnreadCount();
      await refreshNotifications();
    },
    [refreshDmUnreadCount, refreshNotifications],
  );

  const markDmThreadUnread = useCallback(
    async (threadId) => {
      if (!isSupabaseConfigured() || !threadId) return;
      const { error } = await supabase.rpc("mark_dm_thread_unread", { p_thread_id: threadId });
      if (error) console.warn("mark_dm_thread_unread", error.message);
      await refreshDmUnreadCount();
      await refreshNotifications();
    },
    [refreshDmUnreadCount, refreshNotifications],
  );

  const refreshLikes = useCallback(async () => {
    const uid = auth.session?.user?.id;
    if (!isSupabaseConfigured() || !uid) {
      setLikedMixIds([]);
      return;
    }
    const { data, error } = await supabase
      .from("mix_likes")
      .select("mix_id")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("refreshLikes", error.message);
      setLikedMixIds([]);
      return;
    }
    setLikedMixIds((data || []).map((r) => r.mix_id));
  }, [auth.session?.user?.id]);

  const toggleLike = useCallback(
    async (mixId) => {
      const uid = auth.session?.user?.id;
      if (!uid || !mixId || !isSupabaseConfigured()) return;
      setLikedMixIds((prev) => {
        const wasLiked = prev.includes(mixId);
        const next = wasLiked ? prev.filter((x) => x !== mixId) : [mixId, ...prev];
        void (async () => {
          const { error } = wasLiked
            ? await supabase.from("mix_likes").delete().eq("user_id", uid).eq("mix_id", mixId)
            : await supabase.from("mix_likes").insert({ user_id: uid, mix_id: mixId });
          if (error) {
            console.warn("toggleLike", error.message);
            await refreshLikes();
          }
        })();
        return next;
      });
    },
    [auth.session?.user?.id, refreshLikes],
  );

  useEffect(() => {
    void refreshLikes();
  }, [refreshLikes]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    refreshMixes();
    refreshProfiles();
  }, [refreshMixes, refreshProfiles]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications, auth.session?.user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !auth.session?.user?.id) return;
    const uid = auth.session.user.id;
    const channel = supabase
      .channel(`notifications-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        () => {
          void refreshNotifications();
          void refreshDmUnreadCount();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [auth.session?.user?.id, refreshNotifications, refreshDmUnreadCount]);

  /** Own profile row (followers / following counts) when someone follows you or you edit settings */
  useEffect(() => {
    if (!isSupabaseConfigured() || !auth.session?.user?.id) return;
    const uid = auth.session.user.id;
    const channel = supabase
      .channel(`profile-self-${uid}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${uid}` },
        () => {
          void auth.refreshProfile();
          void refreshProfiles();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [auth.session?.user?.id, auth.refreshProfile, refreshProfiles]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !auth.session?.user?.id) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshNotifications();
        void refreshDmUnreadCount();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [auth.session?.user?.id, refreshNotifications, refreshDmUnreadCount]);

  useEffect(() => {
    void refreshDmUnreadCount();
  }, [refreshDmUnreadCount, auth.session?.user?.id]);

  const markAllRead = useCallback(async () => {
    const uid = auth.session?.user?.id;
    if (!uid || !isSupabaseConfigured()) return;
    const { error: dmErr } = await supabase.rpc("mark_all_incoming_dm_read");
    if (dmErr) console.warn("mark_all_incoming_dm_read", dmErr.message);
    await supabase.from("notifications").update({ read: true }).eq("user_id", uid).eq("read", false);
    await refreshNotifications();
    await refreshDmUnreadCount();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [auth.session?.user?.id, refreshNotifications, refreshDmUnreadCount]);

  const markRead = useCallback(
    async (notificationId) => {
      const uid = auth.session?.user?.id;
      if (!uid || !notificationId) return;
      if (String(notificationId).startsWith("local_")) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
        );
        return;
      }
      if (!isSupabaseConfigured()) return;
      const n = notificationsRef.current.find((x) => x.id === notificationId);
      if (n?.type === "dm" && n.meta?.thread_id) {
        await supabase.rpc("mark_dm_thread_read", { p_thread_id: n.meta.thread_id });
        await refreshDmUnreadCount();
      }
      await supabase.from("notifications").update({ read: true }).eq("id", notificationId).eq("user_id", uid);
      await refreshNotifications();
    },
    [auth.session?.user?.id, refreshNotifications, refreshDmUnreadCount],
  );

  /** Client-side only (milestones / top10 extras). DB handles download/share rows via RPC. */
  const notify = useCallback((userId, notification) => {
    if (!userId) return;
    const n = {
      id: notification.id || `local_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: notification.createdAt || new Date().toISOString(),
      read: Boolean(notification.read),
      type: notification.type || "info",
      title: notification.title || "Notification",
      message: notification.message || "",
      href: notification.href || null,
      episodeId: notification.episodeId || null,
      meta: notification.meta || {},
    };
    setNotifications((prev) => {
      if (auth.session?.user?.id !== userId) return prev;
      return [n, ...prev].slice(0, 200);
    });
  }, [auth.session?.user?.id]);

  useEffect(() => {
    const byDownloads = [...episodes].sort((a, b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 10);
    const byPlays = [...episodes].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 10);
    const topIds = new Set([...byDownloads, ...byPlays].map((e) => e.id));

    for (const ep of episodes) {
      if (!topIds.has(ep.id)) continue;
      if (top10NotifiedRef.current.has(ep.id)) continue;
      top10NotifiedRef.current.add(ep.id);
      notify(ep.userId, {
        type: "top10",
        title: "Your mix is in the Top 10",
        message: `"${ep.title}" just entered the Top 10.`,
        href: `/mix/${ep.id}`,
        episodeId: ep.id,
      });
    }
  }, [episodes, notify]);

  const trackEvent = useCallback(
    async (event) => {
      const { kind, episodeId, actorUserId } = event || {};
      if (!kind || !episodeId || !isSupabaseConfigured()) return;

      const before = episodes.find((e) => e.id === episodeId);

      const { error } = await supabase.rpc("record_mix_interaction", {
        p_mix_id: episodeId,
        p_kind: kind,
      });
      if (error) {
        console.warn("record_mix_interaction", error.message);
        return;
      }

      const list = await refreshMixes();
      await refreshNotifications();

      const after = list.find((e) => e.id === episodeId);
      if (!after || !before) return;

      if (actorUserId && actorUserId === after.userId) return;

      const valAfter = kind === "play" ? after.plays : kind === "download" ? after.downloads : after.shares;
      const key = `${episodeId}:${kind}`;
      const last = milestoneRef.current.get(key) || 0;
      const hit = nextMilestoneHit(valAfter, last);
      if (hit) {
        milestoneRef.current.set(key, hit);
        const label = kind === "play" ? "plays" : kind === "download" ? "downloads" : "shares";
        notify(after.userId, {
          type: "milestone",
          title: "Milestone reached",
          message: `"${after.title}" hit ${hit.toLocaleString()} ${label}.`,
          href: `/mix/${after.id}`,
          episodeId: after.id,
          meta: { kind, milestone: hit },
        });
      }
    },
    [episodes, refreshMixes, refreshNotifications, notify],
  );

  const updateMix = useCallback(
    async (mixId, patch) => {
      if (!isSupabaseConfigured()) return { ok: false };
      const row = {
        title: patch.title,
        description: patch.description,
        genre: patch.genre,
        tags: patch.tags,
        tracklist: patch.tracklist,
      };
      const clean = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
      const { error } = await supabase.from("mixes").update(clean).eq("id", mixId);
      if (error) return { ok: false, error: error.message };
      await refreshMixes();
      return { ok: true };
    },
    [refreshMixes],
  );

  const value = useMemo(
    () => ({
      auth,
      player,
      episodes,
      users,
      liveStreams,
      notificationsByUser: auth.session?.user?.id ? { [auth.session.user.id]: notifications } : {},
      notifications,
      refreshMixes,
      refreshProfiles,
      refreshNotifications,
      markAllRead,
      markRead,
      trackEvent,
      updateMix,
      notify,
      dataError,
      supabaseReady: isSupabaseConfigured(),
      likedMixIds,
      refreshLikes,
      toggleLike,
      dmUnreadCount,
      refreshDmUnreadCount,
      markDmThreadRead,
      markDmThreadUnread,
    }),
    [
      auth,
      player,
      episodes,
      users,
      liveStreams,
      notifications,
      refreshMixes,
      refreshProfiles,
      refreshNotifications,
      markAllRead,
      markRead,
      trackEvent,
      updateMix,
      notify,
      dataError,
      likedMixIds,
      refreshLikes,
      toggleLike,
      dmUnreadCount,
      refreshDmUnreadCount,
      markDmThreadRead,
      markDmThreadUnread,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
