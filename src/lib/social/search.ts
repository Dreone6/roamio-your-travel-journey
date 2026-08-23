/**
 * Travel-first search.
 *
 * Roavr searches people, places and live stories — a place result is only
 * returned when at least one traveller the viewer is authorised to see has
 * actually been there, so search can never confirm the existence of a private
 * world. Blocks are filtered out on every result type.
 */
import { supabase } from "@/integrations/supabase/client";
import { resolveMediaUrls } from "@/lib/media";
import { flagEmoji } from "@/lib/world/countries";

export interface PersonResult {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  homeCity: string | null;
}

export interface PlaceResult {
  city: string;
  country: string | null;
  flag: string | null;
  /** Travellers with authorised visits to this place. */
  travelers: number;
  visits: number;
}

export interface StoryResult {
  id: string;
  userId: string;
  authorName: string;
  mediaUrl: string;
  mediaType: string | null;
  locationName: string | null;
}

export interface SearchResults {
  people: PersonResult[];
  places: PlaceResult[];
  stories: StoryResult[];
}

export const EMPTY_SEARCH: SearchResults = { people: [], places: [], stories: [] };

async function blockedIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("blocked_users")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  return new Set((data ?? []).map((b) => (b.blocker_id === userId ? b.blocked_id : b.blocker_id)));
}

export async function searchAll(viewerId: string, rawQuery: string): Promise<SearchResults> {
  const q = rawQuery.trim();
  if (q.length < 2) return EMPTY_SEARCH;
  const like = `%${q}%`;
  const blocked = await blockedIds(viewerId);

  const [peopleRes, placeRes, storyRes] = await Promise.all([
    supabase.from("profiles").select("id, name, username, profile_photo, home_city")
      .or(`name.ilike.${like},username.ilike.${like},home_city.ilike.${like}`).limit(30),
    supabase.from("places_visited").select("user_id, city, country")
      .or(`city.ilike.${like},country.ilike.${like}`).neq("source", "demo").limit(500),
    supabase.from("stories").select("id, user_id, media_url, media_type, location_name, caption")
      .or(`location_name.ilike.${like},caption.ilike.${like}`)
      .gt("expires_at", new Date().toISOString()).limit(30),
  ]);

  const people = (peopleRes.data ?? [])
    .filter((p) => p.id !== viewerId && !blocked.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name || "Traveler",
      username: p.username,
      avatar: p.profile_photo,
      homeCity: p.home_city,
    }));

  const placeMap = new Map<string, { city: string; country: string | null; users: Set<string>; visits: number }>();
  for (const v of placeRes.data ?? []) {
    if (!v.city || blocked.has(v.user_id)) continue;
    const key = `${v.city.toLowerCase()}|${(v.country ?? "").toLowerCase()}`;
    const e = placeMap.get(key) ?? { city: v.city, country: v.country, users: new Set<string>(), visits: 0 };
    e.users.add(v.user_id);
    e.visits += 1;
    placeMap.set(key, e);
  }
  const places = [...placeMap.values()]
    .map((e) => ({
      city: e.city,
      country: e.country,
      flag: flagEmoji(e.country),
      travelers: e.users.size,
      visits: e.visits,
    }))
    .sort((a, b) => b.travelers - a.travelers || b.visits - a.visits)
    .slice(0, 12);

  const storyRows = (storyRes.data ?? []).filter((s) => !blocked.has(s.user_id) && s.media_url);
  const authorIds = [...new Set(storyRows.map((s) => s.user_id))];
  const authors = new Map<string, string>();
  if (authorIds.length) {
    const { data } = await supabase.from("profiles").select("id, name").in("id", authorIds);
    for (const a of data ?? []) authors.set(a.id, a.name || "Traveler");
  }
  const signedStoryMedia = await resolveMediaUrls(storyRows.map((s) => s.media_url));
  const stories = storyRows.map((s, i) => ({
    id: s.id,
    userId: s.user_id,
    authorName: authors.get(s.user_id) ?? "Traveler",
    mediaUrl: (signedStoryMedia[i] ?? "") as string,
    mediaType: s.media_type,
    locationName: s.location_name,
  }));

  return { people, places, stories };
}
