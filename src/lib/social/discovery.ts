/**
 * Traveller discovery.
 *
 * Roavr's answer to "who should I follow?" is not follower count. It is:
 * you have both stood in the same places, or they know the place you are going
 * next. Every number below is computed from `places_visited` rows the viewer is
 * authorised by RLS to read, so a private world can never influence a ranking
 * or leak through a count.
 */
import { supabase } from "@/integrations/supabase/client";
import { flagEmoji } from "@/lib/world/countries";
import type { DiscoverSections, PlaceExpert, TravelerSummary } from "./types";
import { EMPTY_DISCOVER } from "./types";

const CANDIDATE_LIMIT = 120;
const SECTION_SIZE = 8;

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

interface VisitRow {
  user_id: string;
  city: string | null;
  country: string | null;
  date_visited: string | null;
}

export interface ViewerTravel {
  cityKeys: Set<string>;
  countries: Set<string>;
  /** Lower-cased destination fragments from the viewer's upcoming trips. */
  upcoming: { label: string; fragments: string[] }[];
}

export async function loadViewerTravel(userId: string): Promise<ViewerTravel> {
  const [visits, trips] = await Promise.all([
    supabase.from("places_visited").select("city, country").eq("user_id", userId).neq("source", "demo").limit(2000),
    supabase.from("trips").select("destination, status").eq("user_id", userId)
      .in("status", ["planning", "upcoming", "active"]).limit(10),
  ]);

  const cityKeys = new Set<string>();
  const countries = new Set<string>();
  for (const v of visits.data ?? []) {
    if (v.city && v.country) cityKeys.add(`${norm(v.city)}|${norm(v.country)}`);
    if (v.country) countries.add(norm(v.country));
  }

  const upcoming = (trips.data ?? [])
    .filter((t) => t.destination)
    .map((t) => ({
      label: t.destination as string,
      fragments: (t.destination as string).split(/[,/&]| and /i).map(norm).filter((s) => s.length > 2),
    }));

  return { cityKeys, countries, upcoming };
}

async function blockedIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("blocked_users")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  return (data ?? []).map((b) => (b.blocker_id === userId ? b.blocked_id : b.blocker_id));
}

function summarise(
  profile: { id: string; name: string | null; username: string | null; profile_photo: string | null; bio: string | null },
  visits: VisitRow[],
  viewer: ViewerTravel
): TravelerSummary {
  const cityCounts = new Map<string, { city: string; country: string; visits: number; last: string | null }>();
  const countryCounts = new Map<string, { country: string; visits: number }>();

  for (const v of visits) {
    if (!v.city || !v.country) continue;
    const ck = `${norm(v.city)}|${norm(v.country)}`;
    const c = cityCounts.get(ck) ?? { city: v.city, country: v.country, visits: 0, last: null };
    c.visits += 1;
    if (v.date_visited && (!c.last || v.date_visited > c.last)) c.last = v.date_visited;
    cityCounts.set(ck, c);

    const nk = norm(v.country);
    const co = countryCounts.get(nk) ?? { country: v.country, visits: 0 };
    co.visits += 1;
    countryCounts.set(nk, co);
  }

  const sharedCities = [...cityCounts.values()]
    .filter((c) => viewer.cityKeys.has(`${norm(c.city)}|${norm(c.country)}`))
    .map((c) => c.city);
  const sharedCountries = [...countryCounts.values()]
    .filter((c) => viewer.countries.has(norm(c.country)))
    .map((c) => c.country);

  const topCountries = [...countryCounts.values()]
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 3)
    .map((c) => ({ country: c.country, flag: flagEmoji(c.country), visits: c.visits }));
  const topCities = [...cityCounts.values()]
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 3)
    .map((c) => ({ city: c.city, country: c.country, visits: c.visits }));

  return {
    id: profile.id,
    name: profile.name || "Traveler",
    username: profile.username,
    avatar: profile.profile_photo,
    bio: profile.bio,
    countries: countryCounts.size,
    cities: cityCounts.size,
    visits: visits.length,
    topCountries,
    topCities,
    sharedCountries,
    sharedCities,
    reason: null,
    score: 0,
  };
}

/**
 * Load discovery sections for a viewer. One profile query plus one visit query
 * — we never walk the whole social graph.
 */
export async function loadDiscovery(viewerId: string): Promise<DiscoverSections> {
  const viewer = await loadViewerTravel(viewerId);
  const [blocked, followingRes] = await Promise.all([
    blockedIds(viewerId),
    supabase.from("follows").select("following_id").eq("follower_id", viewerId).limit(1000),
  ]);
  const exclude = new Set([viewerId, ...blocked, ...(followingRes.data ?? []).map((f) => f.following_id)]);

  let profileQuery = supabase
    .from("profiles")
    .select("id, name, username, profile_photo, bio, created_at")
    .order("created_at", { ascending: false })
    .limit(CANDIDATE_LIMIT);
  const excluded = [...exclude];
  if (excluded.length) profileQuery = profileQuery.not("id", "in", `(${excluded.join(",")})`);

  const { data: profiles } = await profileQuery;
  if (!profiles?.length) return EMPTY_DISCOVER;

  const ids = profiles.map((p) => p.id);
  const { data: visits } = await supabase
    .from("places_visited")
    .select("user_id, city, country, date_visited")
    .in("user_id", ids)
    .neq("source", "demo")
    .limit(4000);

  const byUser = new Map<string, VisitRow[]>();
  for (const v of (visits ?? []) as VisitRow[]) {
    if (!byUser.has(v.user_id)) byUser.set(v.user_id, []);
    byUser.get(v.user_id)!.push(v);
  }

  const summaries = profiles.map((p) => summarise(p as any, byUser.get(p.id) ?? [], viewer));

  // Places in common — shared cities weigh far more than shared countries.
  const placesInCommon = summaries
    .filter((s) => s.sharedCities.length || s.sharedCountries.length)
    .map((s) => ({
      ...s,
      score: s.sharedCities.length * 10 + s.sharedCountries.length * 3,
      reason:
        s.sharedCities.length
          ? `You've both been to ${s.sharedCities.slice(0, 2).join(" and ")}`
          : `${s.sharedCountries.length} ${s.sharedCountries.length === 1 ? "country" : "countries"} in common`,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, SECTION_SIZE);

  // Travellers who know where you're going.
  const knowWhereYoureGoing: TravelerSummary[] = [];
  if (viewer.upcoming.length) {
    for (const s of summaries) {
      let best: { label: string; visits: number } | null = null;
      for (const trip of viewer.upcoming) {
        for (const c of [...s.topCities, ...s.topCountries.map((x) => ({ city: x.country, country: x.country, visits: x.visits }))]) {
          const target = norm(c.city);
          if (trip.fragments.some((f) => f === target || f.includes(target) || target.includes(f))) {
            if (!best || c.visits > best.visits) best = { label: c.city, visits: c.visits };
          }
        }
      }
      if (best) {
        knowWhereYoureGoing.push({
          ...s,
          score: best.visits * 10,
          reason: best.visits > 1
            ? `Has been to ${best.label} ${best.visits} times`
            : `Has been to ${best.label}`,
        });
      }
    }
    knowWhereYoureGoing.sort((a, b) => b.score - a.score);
  }

  // Travellers you may know — second degree: followed by people you follow.
  const followingIds = (followingRes.data ?? []).map((f) => f.following_id);
  let mayKnow: TravelerSummary[] = [];
  if (followingIds.length) {
    const { data: secondDegree } = await supabase
      .from("follows")
      .select("following_id, follower_id")
      .in("follower_id", followingIds)
      .eq("status", "accepted")
      .limit(500);
    const mutualCount = new Map<string, number>();
    for (const row of secondDegree ?? []) {
      if (exclude.has(row.following_id)) continue;
      mutualCount.set(row.following_id, (mutualCount.get(row.following_id) ?? 0) + 1);
    }
    mayKnow = summaries
      .filter((s) => mutualCount.has(s.id))
      .map((s) => {
        const n = mutualCount.get(s.id)!;
        return { ...s, score: n * 10, reason: `Followed by ${n} ${n === 1 ? "traveler" : "travelers"} you follow` };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, SECTION_SIZE);
  }

  // Interesting travellers — breadth and depth of real, visible travel.
  const seen = new Set([...placesInCommon, ...knowWhereYoureGoing, ...mayKnow].map((s) => s.id));
  const interesting = summaries
    .filter((s) => !seen.has(s.id) && s.countries >= 2)
    .map((s) => {
      const deepest = s.topCountries[0];
      return {
        ...s,
        score: s.countries * 4 + s.cities * 2 + (deepest?.visits ?? 0),
        reason: deepest && deepest.visits > 2
          ? `Visited ${deepest.country} ${deepest.visits} times`
          : `${s.countries} countries · ${s.cities} cities`,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, SECTION_SIZE);

  return {
    placesInCommon,
    knowWhereYoureGoing: knowWhereYoureGoing.slice(0, SECTION_SIZE),
    mayKnow,
    interesting,
  };
}

/**
 * "People who know Medellín" — travellers with authorised repeat history in a
 * destination. Only the visit count and the most recent year are exposed; the
 * exact dates and trips stay behind the owner's privacy settings.
 */
export async function peopleWhoKnowPlace(
  viewerId: string,
  city: string,
  country?: string | null,
  limit = 8
): Promise<PlaceExpert[]> {
  let q = supabase
    .from("places_visited")
    .select("user_id, city, country, date_visited")
    .ilike("city", city)
    .neq("source", "demo")
    .neq("user_id", viewerId)
    .limit(500);
  if (country) q = q.ilike("country", country);

  const [{ data }, blocked] = await Promise.all([q, blockedIds(viewerId)]);
  const blockSet = new Set(blocked);

  const byUser = new Map<string, { visits: number; last: string | null }>();
  for (const v of (data ?? []) as VisitRow[]) {
    if (blockSet.has(v.user_id)) continue;
    const e = byUser.get(v.user_id) ?? { visits: 0, last: null };
    e.visits += 1;
    if (v.date_visited && (!e.last || v.date_visited > e.last)) e.last = v.date_visited;
    byUser.set(v.user_id, e);
  }
  if (!byUser.size) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, username, profile_photo")
    .in("id", [...byUser.keys()]);

  return (profiles ?? [])
    .map((p) => {
      const e = byUser.get(p.id)!;
      return {
        id: p.id,
        name: p.name || "Traveler",
        username: p.username,
        avatar: p.profile_photo,
        visits: e.visits,
        lastYear: e.last ? Number(e.last.slice(0, 4)) : null,
      };
    })
    .sort((a, b) => b.visits - a.visits || (b.lastYear ?? 0) - (a.lastYear ?? 0))
    .slice(0, limit);
}
