/**
 * useFollowState — real follow/block state backed by `follows` + `blocked_users`.
 *
 * The database decides whether a new follow is accepted immediately (public
 * account) or becomes a pending request (private account), so the client never
 * invents social state. Counts come from accepted follow rows only.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type FollowStatus = "none" | "requested" | "following";

export interface FollowState {
  loading: boolean;
  status: FollowStatus;
  followers: number;
  following: number;
  /** True when either side has blocked the other. */
  blocked: boolean;
  /** True when the signed-in user is the one who blocked. */
  blockedByMe: boolean;
  toggleFollow: () => Promise<void>;
  toggleBlock: () => Promise<void>;
  busy: boolean;
}

export function useFollowState(targetId: string | null | undefined): FollowState {
  const { user } = useAuth();
  const [status, setStatus] = useState<FollowStatus>("none");
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!targetId) return;
    const [mine, followerRes, followingRes, blocks] = await Promise.all([
      user
        ? supabase.from("follows").select("status").eq("follower_id", user.id).eq("following_id", targetId).maybeSingle()
        : Promise.resolve({ data: null } as any),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", targetId).eq("status", "accepted"),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", targetId).eq("status", "accepted"),
      user
        ? supabase.from("blocked_users").select("blocker_id, blocked_id")
            .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${targetId}),and(blocker_id.eq.${targetId},blocked_id.eq.${user.id})`)
        : Promise.resolve({ data: [] } as any),
    ]);

    const s = (mine as any).data?.status as string | undefined;
    setStatus(s === "accepted" ? "following" : s ? "requested" : "none");
    setFollowers(followerRes.count ?? 0);
    setFollowing(followingRes.count ?? 0);
    const rows = ((blocks as any).data ?? []) as { blocker_id: string; blocked_id: string }[];
    setBlocked(rows.length > 0);
    setBlockedByMe(rows.some((r) => r.blocker_id === user?.id));
    setLoading(false);
  }, [targetId, user]);

  useEffect(() => { setLoading(true); load().catch(() => setLoading(false)); }, [load]);

  const toggleFollow = useCallback(async () => {
    if (!user || !targetId || busy) return;
    setBusy(true);
    const prev = status;
    // Optimistic: we only ever guess "requested"/"following" the way the server
    // would, and reconcile immediately afterwards.
    if (prev === "none") setStatus("following");
    else setStatus("none");

    try {
      if (prev === "none") {
        const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
        if (error) throw error;
      }
      await load();
    } catch {
      setStatus(prev);
    } finally {
      setBusy(false);
    }
  }, [user, targetId, status, busy, load]);

  const toggleBlock = useCallback(async () => {
    if (!user || !targetId || busy) return;
    setBusy(true);
    try {
      if (blockedByMe) {
        await supabase.from("blocked_users").delete().eq("blocker_id", user.id).eq("blocked_id", targetId);
      } else {
        await supabase.from("blocked_users").insert({ blocker_id: user.id, blocked_id: targetId });
      }
      await load();
    } finally {
      setBusy(false);
    }
  }, [user, targetId, blockedByMe, busy, load]);

  return { loading, status, followers, following, blocked, blockedByMe, toggleFollow, toggleBlock, busy };
}
