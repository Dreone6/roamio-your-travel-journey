/**
 * place-search — authenticated city search + server-side canonical place resolution.
 *
 * Provider: OpenStreetMap Nominatim (the same free, keyless provider used by
 * reverse-geocode). Only city-level results (city/town/village/municipality)
 * are returned. Identity tuple is ("osm", "<N|W|R><osm_id>").
 *
 *  { action: "search",  q }               -> { results: [...] }
 *  { action: "resolve", provider_place_id } -> { place: { id, name, country, ... } }
 *
 * `resolve` re-fetches the place from the provider so client-submitted names
 * or coordinates are never trusted, then upserts public.places with the
 * service role (clients have no write policy on places).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const CITY_TYPES = new Set(["city", "town", "village", "municipality", "hamlet", "suburb", "borough"]);
const UA = { "User-Agent": "Roavr/1.0 (place-search)", "Accept-Language": "en" };

interface NomItem {
  osm_type: string; osm_id: number; lat: string; lon: string;
  addresstype?: string; type?: string; class?: string; name?: string;
  address?: Record<string, string>;
}

function toResult(it: NomItem) {
  const kind = it.addresstype ?? it.type ?? "";
  if (!CITY_TYPES.has(kind)) return null;
  const t = (it.osm_type ?? "")[0]?.toUpperCase();
  if (!["N", "W", "R"].includes(t) || !Number.isFinite(it.osm_id)) return null;
  const a = it.address ?? {};
  const name = it.name || a.city || a.town || a.village || a.municipality;
  const country = a.country;
  const lat = Number(it.lat), lng = Number(it.lon);
  if (!name || !country || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const cc = (a.country_code ?? "").toUpperCase();
  return {
    provider: "osm",
    provider_place_id: `${t}${it.osm_id}`,
    name, country,
    country_code: /^[A-Z]{2}$/.test(cc) ? cc : null,
    region: a.state ?? a.region ?? null,
    latitude: lat, longitude: lng,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: authErr } = await userClient.auth.getUser();
    if (authErr || !u?.user) return json({ error: "Sign in required" }, 401);

    const body = await req.json().catch(() => ({}));
    if (body.action === "search") {
      const q = typeof body.q === "string" ? body.q.trim() : "";
      if (q.length < 2 || q.length > 100) return json({ error: "Query must be 2–100 characters" }, 400);
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&featureType=settlement&q=${encodeURIComponent(q)}`,
        { headers: UA },
      );
      if (!r.ok) return json({ error: "Place search is unavailable right now", status: r.status }, 502);
      const items = (await r.json()) as NomItem[];
      const seen = new Set<string>();
      const results = items.map(toResult).filter((x): x is NonNullable<typeof x> => {
        if (!x || seen.has(x.provider_place_id)) return false;
        seen.add(x.provider_place_id);
        return true;
      }).slice(0, 6);
      return json({ results });
    }

    if (body.action === "resolve") {
      const id = typeof body.provider_place_id === "string" ? body.provider_place_id : "";
      if (!/^[NWR]\d{1,15}$/.test(id)) return json({ error: "Invalid place id" }, 400);
      const r = await fetch(
        `https://nominatim.openstreetmap.org/lookup?format=jsonv2&addressdetails=1&osm_ids=${id}`,
        { headers: UA },
      );
      if (!r.ok) return json({ error: "Place lookup is unavailable right now", status: r.status }, 502);
      const [item] = (await r.json()) as NomItem[];
      const res = item ? toResult(item) : null;
      if (!res || res.provider_place_id !== id) return json({ error: "That place is not a city" }, 422);

      const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data, error } = await admin.from("places").upsert({
        provider: res.provider,
        provider_place_id: res.provider_place_id,
        place_type: "city",
        name: res.name,
        city: res.name,
        country: res.country,
        country_code: res.country_code,
        latitude: res.latitude,
        longitude: res.longitude,
      }, { onConflict: "provider,provider_place_id" }).select("id, name, country, latitude, longitude").single();
      if (error) {
        console.error("places upsert failed", error);
        return json({ error: "Could not save place" }, 500);
      }
      return json({ place: data });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("place-search error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
