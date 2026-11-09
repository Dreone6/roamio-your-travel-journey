import { supabase } from "@/integrations/supabase/client";
import type { TagCountry } from "./countries";

/**
 * Save quick-tagged countries as private, country-only visits (city left
 * empty, no date). Idempotent per country via import_key, so re-running
 * onboarding never creates duplicates.
 */
export async function saveCountryTags(userId: string, countries: TagCountry[]): Promise<number> {
  if (countries.length === 0) return 0;
  const rows = countries.map((c) => ({
    user_id: userId,
    city: "",
    country: c.name,
    latitude: c.lat,
    longitude: c.lng,
    source: "manual",
    visibility: "private",
    scanned_photo_count: 0,
    import_key: `country-tag:${c.code}`,
  }));
  const { data, error } = await supabase
    .from("places_visited")
    .upsert(rows, { onConflict: "user_id,import_key" })
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}
