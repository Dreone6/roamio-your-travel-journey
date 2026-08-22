/**
 * Persistence — writes reviewed trips into the user's real travel data.
 *
 * `places_visited` is the canonical trip/visit store. Each row is ONE visit:
 * a city + country + coordinates + a date range + a memory count, so repeat
 * trips to the same city in different years stay separate records.
 *
 * Duplicate protection uses `import_key` (a stable fingerprint of the
 * clustered location + date window, never the filename), enforced by the
 * unique index on (user_id, import_key).
 *
 * Demo runs are written with `source: 'demo'` and are filtered out of every
 * real travel-identity query and hidden from other users by RLS.
 */
import { supabase } from "@/integrations/supabase/client";
import type { DiscoveredTrip } from "./types";

export interface PersistResult {
  saved: number;
  countries: number;
  cities: number;
  memories: number;
  /** Rows that already existed with the same import_key and were refreshed. */
  duplicates: number;
}

export async function saveDiscoveredTrips(
  userId: string,
  trips: DiscoveredTrip[],
  opts: { demo?: boolean } = {}
): Promise<PersistResult> {
  const selected = trips.filter((t) => t.selected);
  if (selected.length === 0) {
    return { saved: 0, countries: 0, cities: 0, memories: 0, duplicates: 0 };
  }

  const keys = selected.map((t) => t.importKey);

  // How many of these were already imported before this run?
  const { data: existing } = await supabase
    .from("places_visited")
    .select("import_key")
    .eq("user_id", userId)
    .in("import_key", keys);
  const duplicates = existing?.length ?? 0;

  const rows = selected.map((t) => ({
    user_id: userId,
    city: t.city,
    country: t.country,
    latitude: t.latitude,
    longitude: t.longitude,
    date_visited: t.startDate.slice(0, 10),
    end_date: t.endDate.slice(0, 10),
    photos_count: t.memoryCount,
    visibility: opts.demo ? "private" : t.visibility,
    source: opts.demo ? "demo" : "photo_import",
    import_key: t.importKey,
  }));

  // Upsert on the unique (user_id, import_key) index: re-importing the same
  // photos refreshes the existing visit instead of creating a twin.
  const { data, error } = await supabase
    .from("places_visited")
    .upsert(rows, { onConflict: "user_id,import_key" })
    .select("id, city, country, photos_count");

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Nothing was saved");
  }

  return {
    saved: data.length,
    countries: new Set(data.map((r) => r.country)).size,
    cities: new Set(data.map((r) => `${r.city}|${r.country}`)).size,
    memories: data.reduce((s, r) => s + (r.photos_count ?? 0), 0),
    duplicates,
  };
}
