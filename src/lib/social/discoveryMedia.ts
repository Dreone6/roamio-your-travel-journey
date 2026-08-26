/**
 * Organic discovery media — real photos and clips travellers chose to share
 * publicly. Powers the masonry grid on Discover. Everything passes through
 * RLS; nothing is fabricated when the result is thin.
 */
import { supabase } from "@/integrations/supabase/client";
import { resolveMediaUrls } from "@/lib/media";
import type { FeedAuthor } from "./types";

export interface DiscoveryTile {
  id: string;
  author: FeedAuthor;
  mediaUrl: string;
  mediaType: "image" | "video";
  locationName: string | null;
  createdAt: string;
}

export async function loadDiscoveryMedia(viewerId: string, limit = 24): Promise<DiscoveryTile[]> {
  const nowIso = new Date().toISOString();
  const cols = "id, user_id, media_url, media_type, location_name, created_at";

  const [memRes, storyRes] = await Promise.all([
    supabase
      .from("memories")
      .select(cols)
      .eq("visibility", "public")
      .neq("user_id", viewerId)
      .not("media_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("stories")
      .select(cols)
      .eq("visibility", "public")
      .neq("user_id", viewerId)
      .not("media_url", "is", null)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const rows = [...(memRes.data ?? []), ...(storyRes.data ?? [])]
    .filter((r: any) => r.media_url)
    .sort((a: any, b: any) => (b.created_at as string).localeCompare(a.created_at as string))
    .slice(0, limit);
  if (!rows.length) return [];

  const authorIds = [...new Set(rows.map((r: any) => r.user_id as string))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, username, profile_photo")
    .in("id", authorIds);
  const authors = new Map<string, FeedAuthor>(
    (profiles ?? []).map((p) => [
      p.id,
      { id: p.id, name: p.name || "Traveler", username: p.username, avatar: p.profile_photo },
    ]),
  );

  const tiles = rows.flatMap((r: any): DiscoveryTile[] => {
    const author = authors.get(r.user_id);
    if (!author) return [];
    return [{
      id: r.id,
      author,
      mediaUrl: r.media_url,
      mediaType: r.media_type === "video" ? "video" : "image",
      locationName: r.location_name ?? null,
      createdAt: r.created_at,
    }];
  });

  const signed = await resolveMediaUrls(tiles.map((t) => t.mediaUrl));
  tiles.forEach((t, i) => { t.mediaUrl = signed[i] ?? t.mediaUrl; });
  return tiles;
}
