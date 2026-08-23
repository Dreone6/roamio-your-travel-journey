/**
 * The Roavr travel feed.
 *
 * Content sources, in order of importance:
 *   memories   — real uploaded media a traveller chose to share
 *   stories    — live 24h posts
 *   check-ins  — only when deliberately marked shareable (visibility column)
 *   milestones — `places_visited` rows explicitly flagged as a milestone AND
 *                given a non-private visibility by their owner
 *
 * A private or imported visit never becomes a post. Every query below relies
 * on Row Level Security for authorisation — nothing is fetched and then hidden
 * in the client, and blocked relationships are excluded at the database layer.
 */
import { supabase } from "@/integrations/supabase/client";
import { resolveMediaUrls } from "@/lib/media";
import type { FeedAuthor, FeedItem } from "./types";
import { rankFeed, type ViewerContext } from "./ranking";

export const PAGE_SIZE = 20;

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/** Split "Rome, Italy" into a city/country pair when it is safe to do so. */
function splitLocation(label: string | null): { city: string | null; country: string | null } {
  if (!label) return { city: null, country: null };
  const parts = label.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { city: parts[0], country: parts[parts.length - 1] };
  return { city: parts[0] ?? null, country: null };
}

export interface FeedResult {
  items: FeedItem[];
  /** True when the viewer follows nobody — Home shows the discovery onboarding. */
  followsNobody: boolean;
  hasMore: boolean;
}

export async function loadFollowing(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("status", "accepted")
    .limit(1000);
  return (data ?? []).map((r) => r.following_id);
}

/** The viewer's own travel + trip context, used for ranking and relevance. */
export async function loadViewerContext(userId: string): Promise<ViewerContext> {
  const [followRes, visitRes, tripRes] = await Promise.all([
    loadFollowing(userId),
    supabase.from("places_visited").select("city, country").eq("user_id", userId).neq("source", "demo").limit(2000),
    supabase.from("trips").select("destination, start_date, status").eq("user_id", userId)
      .in("status", ["planning", "active"]).limit(20),
  ]);

  const visitedCityKeys = new Set<string>();
  const visitedCountries = new Set<string>();
  for (const v of visitRes.data ?? []) {
    if (v.city && v.country) visitedCityKeys.add(`${norm(v.city)}|${norm(v.country)}`);
    if (v.country) visitedCountries.add(norm(v.country));
  }

  const upcomingDestinations = new Set<string>();
  for (const t of tripRes.data ?? []) {
    for (const part of (t.destination ?? "").split(/[,/&]| and /i)) {
      const p = norm(part);
      if (p.length > 2) upcomingDestinations.add(p);
    }
  }

  return {
    followingIds: new Set(followRes),
    visitedCityKeys,
    visitedCountries,
    upcomingDestinations,
  };
}

async function loadAuthors(ids: string[]): Promise<Map<string, FeedAuthor>> {
  if (!ids.length) return new Map();
  const { data } = await supabase
    .from("profiles")
    .select("id, name, username, profile_photo")
    .in("id", ids);
  return new Map(
    (data ?? []).map((p) => [
      p.id,
      { id: p.id, name: p.name || "Traveler", username: p.username, avatar: p.profile_photo },
    ])
  );
}

/**
 * Build one page of the feed. `authorIds` is the audience: the people the
 * viewer follows plus the viewer. RLS still decides what of theirs is visible.
 */
export async function loadFeed(
  viewerId: string,
  ctx: ViewerContext,
  opts: { before?: string; limit?: number } = {}
): Promise<FeedResult> {
  const limit = opts.limit ?? PAGE_SIZE;
  const authorIds = [...new Set([viewerId, ...ctx.followingIds])];
  const followsNobody = ctx.followingIds.size === 0;
  const before = opts.before;
  const nowIso = new Date().toISOString();
  const cap = limit * 2;

  const withBefore = <T extends { lt: (c: string, v: string) => T }>(q: T, col = "created_at") =>
    before ? q.lt(col, before) : q;

  const [memRes, storyRes, checkRes, milestoneRes] = await Promise.all([
    withBefore(
      supabase.from("memories")
        .select("id, user_id, media_url, media_type, caption, location_name, created_at, visibility")
        .in("user_id", authorIds)
        .neq("visibility", "private")
        .order("created_at", { ascending: false })
        .limit(cap) as any
    ),
    withBefore(
      supabase.from("stories")
        .select("id, user_id, media_url, media_type, caption, location_name, created_at, visibility")
        .in("user_id", authorIds)
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: false })
        .limit(cap) as any
    ),
    withBefore(
      supabase.from("check_ins")
        .select("id, user_id, location_name, city, country, notes, photo, created_at, visibility")
        .in("user_id", authorIds)
        .neq("visibility", "private")
        .order("created_at", { ascending: false })
        .limit(cap) as any
    ),
    withBefore(
      supabase.from("places_visited")
        .select("id, user_id, city, country, milestone_type, created_at, visibility, is_milestone, source")
        .in("user_id", authorIds)
        .eq("is_milestone", true)
        .neq("visibility", "private")
        .neq("source", "demo")
        .order("created_at", { ascending: false })
        .limit(cap) as any
    ),
  ]);

  const rows = [
    ...(memRes.data ?? []).map((r: any) => ({ kind: "memory" as const, r })),
    ...(storyRes.data ?? []).map((r: any) => ({ kind: "story" as const, r })),
    ...(checkRes.data ?? []).map((r: any) => ({ kind: "checkin" as const, r })),
    ...(milestoneRes.data ?? []).map((r: any) => ({ kind: "milestone" as const, r })),
  ];

  const authors = await loadAuthors([...new Set(rows.map((x) => x.r.user_id))]);

  const items: FeedItem[] = rows.flatMap(({ kind, r }) => {
    const author = authors.get(r.user_id);
    if (!author) return [];
    const base = {
      id: `${kind}:${r.id}`,
      author,
      createdAt: r.created_at as string,
      context: [],
      score: 0,
    };

    if (kind === "memory" || kind === "story") {
      const loc = splitLocation(r.location_name);
      return [{
        ...base,
        type: kind,
        mediaUrl: r.media_url ?? null,
        mediaType: (r.media_type === "video" ? "video" : "image") as "image" | "video",
        caption: r.caption ?? null,
        city: loc.city,
        country: loc.country,
        locationName: r.location_name ?? null,
      }];
    }

    if (kind === "checkin") {
      return [{
        ...base,
        type: "checkin" as const,
        mediaUrl: r.photo ?? null,
        mediaType: r.photo ? ("image" as const) : null,
        caption: r.notes ?? null,
        city: r.city ?? splitLocation(r.location_name).city,
        country: r.country ?? splitLocation(r.location_name).country,
        locationName: r.location_name ?? null,
      }];
    }

    return [{
      ...base,
      type: "milestone" as const,
      mediaUrl: null,
      mediaType: null,
      caption: r.milestone_type ?? null,
      city: r.city ?? null,
      country: r.country ?? null,
      locationName: r.city && r.country ? `${r.city}, ${r.country}` : (r.country ?? null),
    }];
  });

  const ranked = rankFeed(items, ctx);
  const page = ranked.slice(0, limit);
  // Private-bucket media is stored as a token; sign only what this page renders.
  const signed = await resolveMediaUrls(page.map((i) => i.mediaUrl));
  page.forEach((item, idx) => { item.mediaUrl = signed[idx]; });
  return {
    items: page,
    followsNobody,
    hasMore: ranked.length > limit,
  };
}

