/**
 * Persistence — writes reviewed trips into the user's real travel data.
 *
 * Uses the existing `places_visited` table (city, country, coordinates,
 * date_visited, photos_count) — no schema change required. Demo-mode runs
 * are marked so they can be identified and cleaned up.
 */
import { supabase } from "@/integrations/supabase/client";
import type { DiscoveredTrip } from "./types";

export interface PersistResult {
  saved: number;
  countries: number;
  cities: number;
  memories: number;
}

export async function saveDiscoveredTrips(
  userId: string,
  trips: DiscoveredTrip[],
  opts: { demo?: boolean } = {}
): Promise<PersistResult> {
  const selected = trips.filter((t) => t.selected);
  if (selected.length === 0) return { saved: 0, countries: 0, cities: 0, memories: 0 };

  const rows = selected.map((t) => ({
    user_id: userId,
    city: t.city,
    country: t.country,
    latitude: t.latitude,
    longitude: t.longitude,
    date_visited: t.startDate.slice(0, 10),
    photos_count: t.memoryCount,
    milestone_type: opts.demo ? "demo_import" : "photo_import",
  }));

  const { error } = await supabase.from("places_visited").insert(rows);
  if (error) throw error;

  return {
    saved: selected.length,
    countries: new Set(selected.map((t) => t.country)).size,
    cities: new Set(selected.map((t) => `${t.city}|${t.country}`)).size,
    memories: selected.reduce((s, t) => s + t.memoryCount, 0),
  };
}
