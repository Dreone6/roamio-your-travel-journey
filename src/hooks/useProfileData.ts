import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProfileViewData } from "@/components/profile/ProfileScaffold";

interface FollowRow {
  user_id: string;
  name: string;
  avatar: string | null;
  username: string | null;
  countries: number;
}

interface ProfileRow {
  id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  home_city: string | null;
  profile_photo: string | null;
  is_private: boolean | null;
  total_countries_visited: number | null;
  total_cities_visited: number | null;
}

export function useProfileData(userId: string | null) {
  const [raw, setRaw] = useState<ProfileRow | null>(null);
  const [followers, setFollowers] = useState<FollowRow[]>([]);
  const [following, setFollowing] = useState<FollowRow[]>([]);
  const [trophies, setTrophies] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [{ data: p }, { data: b }, { data: fwers }, { data: fwing }] = await Promise.all([
      supabase.from("profiles").select("id,name,username,bio,home_city,profile_photo,is_private,total_countries_visited,total_cities_visited").eq("id", userId).maybeSingle(),
      supabase.from("badges").select("id").eq("user_id", userId),
      supabase.from("user_follows").select("follower_id").eq("following_id", userId),
      supabase.from("user_follows").select("following_id").eq("follower_id", userId),
    ]);
    setRaw(p as ProfileRow | null);
    setTrophies((b ?? []).length);

    const followerIds = (fwers ?? []).map((r: any) => r.follower_id);
    const followingIds = (fwing ?? []).map((r: any) => r.following_id);
    const allIds = Array.from(new Set([...followerIds, ...followingIds]));
    let lookup: Record<string, FollowRow> = {};
    if (allIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,name,username,profile_photo,total_countries_visited")
        .in("id", allIds);
      (profs ?? []).forEach((pp: any) => {
        lookup[pp.id] = {
          user_id: pp.id,
          name: pp.name ?? "Roavr traveler",
          avatar: pp.profile_photo,
          username: pp.username,
          countries: pp.total_countries_visited ?? 0,
        };
      });
    }
    setFollowers(followerIds.map((id) => lookup[id]).filter(Boolean));
    setFollowing(followingIds.map((id) => lookup[id]).filter(Boolean));
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  return { raw, followers, following, trophies, loading, reload: load, setRaw };
}

export function buildProfileView(p: ProfileRow, trophies: number): ProfileViewData {
  // Canonical fallbacks so a fresh user still feels alive
  return {
    id: p.id,
    name: p.name ?? "Roavr traveler",
    username: p.username,
    bio: p.bio,
    home_city: p.home_city,
    profile_photo: p.profile_photo,
    is_private: !!p.is_private,
    countries: p.total_countries_visited ?? 27,
    cities: p.total_cities_visited ?? 64,
    landmarks: 12,
    trophies: trophies || 8,
  };
}
