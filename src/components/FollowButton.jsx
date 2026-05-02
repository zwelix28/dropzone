import { useCallback, useEffect, useState } from "react";
import Icon from "./Icon.jsx";
import { useApp } from "../context/AppContext.jsx";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";

export default function FollowButton({
  targetUserId,
  className = "",
  /** @type {'default' | 'compact'} */
  variant = "default",
  /** Called after a successful follow or unfollow (e.g. refresh a list). */
  onFollowChange,
  style: styleProp,
}) {
  const variantStyle = variant === "compact" ? { padding: "7px 12px", fontSize: 12 } : undefined;
  const btnStyle = styleProp ? { ...variantStyle, ...styleProp } : variantStyle;
  const { auth, refreshProfiles } = useApp();
  const uid = auth.session?.user?.id;
  const [following, setFollowing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured() || !uid || !targetUserId || uid === targetUserId) {
      setFollowing(false);
      return;
    }
    const { data, error } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", uid)
      .eq("following_id", targetUserId)
      .maybeSingle();
    if (error) {
      setFollowing(false);
      return;
    }
    setFollowing(Boolean(data));
  }, [uid, targetUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!targetUserId || (uid && uid === targetUserId)) return null;

  if (!uid) {
    return (
      <button
        type="button"
        className={`btn btn-primary ${className}`.trim()}
        style={btnStyle}
        onClick={() => auth.setShowAuth(true)}
      >
        <Icon name="people" size={14} />
        Follow
      </button>
    );
  }

  if (following === null) {
    return (
      <button
        type="button"
        className={`btn btn-ghost ${className}`.trim()}
        disabled
        style={{ ...variantStyle, ...styleProp, opacity: 0.6 }}
      >
        …
      </button>
    );
  }

  const toggle = async () => {
    if (!isSupabaseConfigured() || busy) return;
    setBusy(true);
    try {
      if (following) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", uid)
          .eq("following_id", targetUserId);
        if (!error) {
          setFollowing(false);
          await refreshProfiles();
          await auth.refreshProfile();
          onFollowChange?.();
        }
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: uid,
          following_id: targetUserId,
        });
        if (!error) {
          setFollowing(true);
          await refreshProfiles();
          await auth.refreshProfile();
          onFollowChange?.();
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`btn ${following ? "btn-ghost" : "btn-primary"} ${className}`.trim()}
      style={btnStyle}
      disabled={busy}
      onClick={() => void toggle()}
    >
      <Icon name={following ? "check" : "people"} size={14} />
      {following ? "Following" : "Follow"}
    </button>
  );
}
