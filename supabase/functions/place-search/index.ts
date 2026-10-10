/**
 * place-search — authenticated city search + server-side canonical place resolution.
 *
 * Provider: Photon (komoot), free/keyless over OpenStreetMap data. Only
 * city-level results (city/town/village) are returned. Identity tuple is ("osm", "<N|W|R><osm_id>").
 *
 *  { action: "search",  q }               -> { results: [...] }
 *  { action: "resolve", provider_place_id, q } -> { place: { id, name, country, ... } }
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

const CITY_TYPES = new Set(["city", "town", "village", "municipality", "locality"]);
const UA = { "User-Agent": "Roavr/1.0 (https://roavr.lovable.app; place-search)", "Referer": "https://roavr.lovable.app" };

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_type?: string; osm_id?: number; type?: string; name?: string;
    country?: string; countrycode?: string; state?: string;
  };
}

// Photon (komoot, OSM-based, keyless). Nominatim rejects requests from the backend host (403).
async function photonSearch(q: string) {
  const r = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=10&lang=en&layer=city`,
    { headers: UA },
  );
  if (!r.ok) {
    console.error("photon", r.status, (await r.text()).slice(0, 200));
    return null;
  }
  const fc = (await r.json()) as { features?: PhotonFeature[] };
  const seen = new Set<string>();
  return (fc.features ?? []).map(toResult).filter((x): x is NonNullable<ReturnType<typeof toResult>> => {
    if (!x || seen.has(x.provider_place_id)) return false;
    seen.add(x.provider_place_id);
    return true;
  });
}

function toResult(f: PhotonFeature) {
  const p = f.properties ?? {};
  if (!CITY_TYPES.has(p.type ?? "")) return null;
  const t = (p.osm_type ?? "").toUpperCase()[0];
  if (!["N", "W", "R"].includes(t) || !Number.isFinite(p.osm_id)) return null;
  const [lng, lat] = f.geometry?.coordinates ?? [];
  if (!p.name || !p.country || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const cc = (p.countrycode ?? "").toUpperCase();
  return {
    provider: "osm",
    provider_place_id: `${t}${p.osm_id}`,
    name: p.name, country: p.country,
    country_code: /^[A-Z]{2}$/.test(cc) ? cc : null,
    region: p.state ?? null,
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
      const list = await photonSearch(q);
      if (!list) return json({ error: "Place search is unavailable right now" }, 502);
      const results = list.slice(0, 6);
      return json({ results });
    }

    if (body.action === "resolve") {
      const id = typeof body.provider_place_id === "string" ? body.provider_place_id : "";
      if (!/^[NWR]\d{1,15}$/.test(id)) return json({ error: "Invalid place id" }, 400);
      // Re-query the provider and require the id to come back as a city; client names/coords are ignored.
      const q = typeof body.q === "string" ? body.q.trim().slice(0, 100) : "";
      if (q.length < 2) return json({ error: "Search text required" }, 400);
      const list = await photonSearch(q);
      if (!list) return json({ error: "Place lookup is unavailable right now" }, 502);
      const res = list.find((x) => x.provider_place_id === id);
      if (!res) return json({ error: "Could not confirm that city" }, 422);

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
