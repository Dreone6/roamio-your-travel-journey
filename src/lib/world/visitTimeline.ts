/**
 * City visit timeline — one owner-scoped query for visits + linked memories,
 * and the atomic `add_visit_memory` save. RLS decides what the viewer sees.
 */
import { supabase } from "@/integrations/supabase/client";
import { checkRpcOutcome } from "./manualVisit";
import type { Visibility } from "./manualVisit";

export interface TimelineMemory {
  id: string;
  mediaType: "photo" | "video" | "note";
  mediaUrl: string | null;
  caption: string | null;
  createdAt: string;
  visibility: Visibility;
}

export interface TimelineVisit {
  id: string;
  city: string;
  country: string;
  startDate: string | null;
  endDate: string | null;
  source: string;
  visibility: Visibility;
  canonicalPlaceId: string | null;
  scannedPhotos: number;
  memories: TimelineMemory[];
}

/**
 * Loads the target owner's visits for one city. Scope = owner AND the exact
 * visit ids grouped into this city (canonical-aware grouping in visits.ts),
 * so legacy rows with no canonical id are kept and other same-name cities
 * or other users are never pulled in.
 */
export async function fetchCityTimeline(ownerId: string, visitIds: string[]): Promise<TimelineVisit[]> {
  if (!ownerId || visitIds.length === 0) return [];
  const { data, error } = await supabase
    .from("places_visited")
    .select("id, city, country, date_visited, end_date, source, visibility, canonical_place_id, scanned_photo_count, memories(id, media_type, media_url, caption, created_at, visibility)")
    .eq("user_id", ownerId)
    .in("id", visitIds)
    .neq("source", "demo")
    .order("date_visited", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    city: r.city,
    country: r.country,
    startDate: r.date_visited,
    endDate: r.end_date,
    source: r.source,
    visibility: (r.visibility as Visibility) ?? "private",
    canonicalPlaceId: r.canonical_place_id ?? null,
    scannedPhotos: r.scanned_photo_count ?? 0,
    memories: ((r as { memories?: Array<Record<string, unknown>> }).memories ?? [])
      .map((m) => ({
        id: m.id as string,
        mediaType: m.media_type as TimelineMemory["mediaType"],
        mediaUrl: (m.media_url as string | null) ?? null,
        caption: (m.caption as string | null) ?? null,
        createdAt: m.created_at as string,
        visibility: (m.visibility as Visibility) ?? "private",
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  }));
}

export function sourceLabel(source: string): string {
  switch (source) {
    case "photo_import": return "Logged from photo metadata";
    case "manual": return "Visit logged";
    case "checkin": return "Checked in";
    case "trip": return "From a trip";
    default: return "Visit logged";
  }
}

export interface AddMemoryArgs {
  requestId: string;
  visitId: string;
  note: string;
  photoTokens: string[];
  visibility: Visibility;
}

export async function addVisitMemory(a: AddMemoryArgs): Promise<{ visitId: string; memories: number }> {
  const { data, error } = await supabase.rpc("add_visit_memory", {
    p_client_request_id: a.requestId,
    p_visit_id: a.visitId,
    p_note: a.note,
    p_photos: a.photoTokens,
    p_visibility: a.visibility,
  } as never);
  const r = checkRpcOutcome(data, error);
  return { visitId: r.visit_id, memories: typeof r.memories === "number" ? r.memories : 0 };
}
