/**
 * useTravelIdentity — the single source of truth for a logged-in user's
 * travel identity. Every authenticated screen (Home, World, You) must read
 * its numbers from here so they can never disagree.
 *
 * No mock data. Empty accounts return zeros so the UI can render an
 * intentional empty state instead of fake travel history.
 */
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type PinCategory = "memory" | "checkin" | "visit";

export interface IdentityPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  description?: string | null;
  category: PinCategory;
  thumbnail?: string | null;
  visibility: "private" | "followers" | "public";
  createdAt: string;
  countryCode?: string;
  country?: string | null;
  city?: string | null;
}

export interface TravelIdentity {
  loading: boolean;
  name: string;
  username: string | null;
  bio: string | null;
  homeCity: string | null;
  avatar: string | null;
  countries: number;
  cities: number;
  memories: number;
  trips: number;
  completedTrips: number;
  checkIns: number;
  badges: number;
  followers: number;
  following: number;
  unreadNotifications: number;
  pins: IdentityPin[];
  latestPin: IdentityPin | null;
  recentTrip: {
    id: string;
    title: string;
    destination: string;
    coverPhoto: string | null;
    startDate: string | null;
    status: string;
  } | null;
  countryList: string[];
  isEmpty: boolean;
  refresh: () => void;
}

const EMPTY: Omit<TravelIdentity, "refresh"> = {
  loading: true,
  name: "",
  username: null,
  bio: null,
  homeCity: null,
  avatar: null,
  countries: 0,
  cities: 0,
  memories: 0,
  trips: 0,
  completedTrips: 0,
  checkIns: 0,
  badges: 0,
  followers: 0,
  following: 0,
  unreadNotifications: 0,
  pins: [],
  latestPin: null,
  recentTrip: null,
  countryList: [],
  isEmpty: true,
};

export function useTravelIdentity(): TravelIdentity {
  const { user } = useAuth();
  const [state, setState] = useState(EMPTY);
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!user) {
      setState({ ...EMPTY, loading: false });
      return;
    }
    let cancelled = false;

    (async () => {
      const uid = user.id;
      const [
        profileRes, visits, checkinsRes, memoriesRes,
        tripsRes, badgesRes, followersRes, followingRes, notifRes,
      ] = await Promise.all([
        supabase.from("profiles").select("name, username, bio, home_city, profile_photo").eq("id", uid).maybeSingle(),
        // Canonical visit store. `source = 'demo'` rows are fixtures and are
        // filtered out inside fetchVisits.
        fetchVisits(uid),
        supabase.from("check_ins").select("id, location_name, city, country, latitude, longitude, timestamp, notes, photo").eq("user_id", uid),
        supabase.from("memories").select("id, media_url, caption, location_name, latitude, longitude, pinned_to_globe, visibility, created_at, trip_id").eq("user_id", uid),
        supabase.from("trips").select("id, title, destination, status, cover_photo, start_date, created_at").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("badges").select("id").eq("user_id", uid),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", uid).eq("status", "accepted"),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", uid).eq("status", "accepted"),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("read", false),
      ]);

      if (cancelled) return;

      const checkins = checkinsRes.data ?? [];
      const memories = memoriesRes.data ?? [];
      const trips = tripsRes.data ?? [];

      // Countries/cities/visits all come from the canonical visit store so
      // Home, Profile, World and Passport can never disagree.
      const world = aggregateWorld(visits);

      const pins: IdentityPin[] = [];
      visits.forEach((p) => {
        if (p.latitude == null || p.longitude == null) return;
        pins.push({
          id: `place-${p.id}`,
          lat: p.latitude,
          lng: p.longitude,
          label: [p.city, p.country].filter(Boolean).join(", ") || "Visited",
          category: "visit",
          visibility: p.visibility,
          createdAt: p.startDate ?? new Date(0).toISOString(),
          country: p.country,
          city: p.city,
        });
      });
      checkins.forEach((c) => {
        if (c.latitude == null || c.longitude == null) return;
        pins.push({
          id: `checkin-${c.id}`,
          lat: c.latitude,
          lng: c.longitude,
          label: c.location_name,
          description: c.notes,
          category: "checkin",
          thumbnail: c.photo,
          visibility: "public",
          createdAt: c.timestamp,
          country: c.country,
          city: c.city,
        });
      });
      memories.forEach((m) => {
        if (m.latitude == null || m.longitude == null || !m.pinned_to_globe) return;
        pins.push({
          id: `memory-${m.id}`,
          lat: m.latitude,
          lng: m.longitude,
          label: m.location_name || "Memory",
          description: m.caption,
          category: "memory",
          thumbnail: m.media_url,
          visibility: (m.visibility as IdentityPin["visibility"]) ?? "private",
          createdAt: m.created_at,
        });
      });
      pins.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const profile = profileRes.data;
      const recent = trips[0];

      setState({
        loading: false,
        name: profile?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Traveler",
        username: profile?.username ?? null,
        bio: profile?.bio ?? null,
        homeCity: profile?.home_city ?? null,
        avatar: profile?.profile_photo ?? null,
        countries: countrySet.size,
        cities: citySet.size,
        memories: memories.length,
        trips: trips.length,
        completedTrips: trips.filter((t) => t.status === "completed").length,
        checkIns: checkins.length,
        badges: badgesRes.data?.length ?? 0,
        followers: followersRes.count ?? 0,
        following: followingRes.count ?? 0,
        unreadNotifications: notifRes.count ?? 0,
        pins,
        latestPin: pins[0] ?? null,
        recentTrip: recent
          ? {
              id: recent.id,
              title: recent.title,
              destination: recent.destination,
              coverPhoto: recent.cover_photo,
              startDate: recent.start_date,
              status: recent.status,
            }
          : null,
        countryList: [...countrySet],
        isEmpty: pins.length === 0 && memories.length === 0 && trips.length === 0,
      });
    })().catch(() => {
      if (!cancelled) setState({ ...EMPTY, loading: false });
    });

    return () => { cancelled = true; };
  }, [user, nonce]);

  return { ...state, refresh };
}
