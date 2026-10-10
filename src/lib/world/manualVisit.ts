/**
 * Manual past visit — client service.
 * City search + canonical place resolution run server-side (place-search);
 * the visit + memories are written by the atomic `record_manual_visit` RPC.
 */
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { USER_MEDIA_BUCKET } from "@/lib/media";

export interface CityResult {
  provider: string;
  provider_place_id: string;
  name: string;
  country: string;
  country_code: string | null;
  region: string | null;
  latitude: number;
  longitude: number;
}

export type Visibility = "private" | "followers" | "public";

export const MAX_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

async function fnError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try { return (await error.context.json())?.error ?? "Request failed"; } catch { /* fallthrough */ }
  }
  return error instanceof Error ? error.message : "Request failed";
}

export async function searchCities(q: string): Promise<CityResult[]> {
  const { data, error } = await supabase.functions.invoke("place-search", { body: { action: "search", q } });
  if (error) throw new Error(await fnError(error));
  return (data?.results ?? []) as CityResult[];
}

export async function resolveCity(providerPlaceId: string, q: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("place-search", {
    body: { action: "resolve", provider_place_id: providerPlaceId, q },
  });
  if (error) throw new Error(await fnError(error));
  if (!data?.place?.id) throw new Error("Could not confirm that city");
  return data.place.id as string;
}

/** Local calendar date as YYYY-MM-DD (no UTC shift). */
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Returns an error message or null. Dates are plain YYYY-MM-DD strings. */
export function validateDates(start: string, end: string, today = todayLocal()): string | null {
  if (!start) return "Choose when the trip started";
  if (start > today) return "Start date can't be in the future";
  if (end && end > today) return "End date can't be in the future";
  if (end && end < start) return "End date must be on or after the start date";
  return null;
}

export function validatePhoto(f: File): string | null {
  if (!PHOTO_TYPES.includes(f.type)) return `${f.name}: use JPG, PNG, WEBP or HEIC`;
  if (f.size > MAX_PHOTO_BYTES) return `${f.name}: larger than 15 MB`;
  return null;
}

export async function removeUploadedToken(token: string) {
  const path = token.slice(USER_MEDIA_BUCKET.length + 1);
  await supabase.storage.from(USER_MEDIA_BUCKET).remove([path]);
}

export interface SaveArgs {
  requestId: string;
  placeId: string;
  start: string;
  end: string;
  note: string;
  photoTokens: string[];
  visibility: Visibility;
}

export class SaveError extends Error {
  constructor(message: string, public ambiguous: boolean) { super(message); }
}

export async function saveManualVisit(a: SaveArgs): Promise<{ visitId: string; memories: number }> {
  const { data, error } = await supabase.rpc("record_manual_visit", {
    p_client_request_id: a.requestId,
    p_place_id: a.placeId,
    p_start: a.start,
    p_end: a.end || null,
    p_note: a.note,
    p_photos: a.photoTokens,
    p_visibility: a.visibility,
  } as never);
  if (error) {
    // A Postgres error code means the server rejected and rolled back; no code = unknown outcome.
    throw new SaveError(error.message || "Could not save trip", !error.code);
  }
  const r = data as { visit_id: string; memories: number };
  return { visitId: r.visit_id, memories: r.memories };
}
