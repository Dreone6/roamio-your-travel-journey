/**
 * Location normalization — coordinates -> { city, country }.
 * Uses the existing reverse-geocode edge function, with a coarse offline
 * fallback so the flow never dead-ends when the network is unavailable.
 */
import { supabase } from "@/integrations/supabase/client";
import type { NormalizedPlace } from "./types";

const FALLBACK_CITIES: { city: string; country: string; lat: number; lng: number }[] = [
  { city: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278 },
  { city: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
  { city: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964 },
  { city: "Positano", country: "Italy", lat: 40.6281, lng: 14.4841 },
  { city: "Barcelona", country: "Spain", lat: 41.3874, lng: 2.1686 },
  { city: "Lisbon", country: "Portugal", lat: 38.7223, lng: -9.1393 },
  { city: "Berlin", country: "Germany", lat: 52.52, lng: 13.405 },
  { city: "Amsterdam", country: "Netherlands", lat: 52.3676, lng: 4.9041 },
  { city: "Reykjavík", country: "Iceland", lat: 64.1466, lng: -21.9426 },
  { city: "Marrakech", country: "Morocco", lat: 31.6295, lng: -7.9811 },
  { city: "Cape Town", country: "South Africa", lat: -33.9249, lng: 18.4241 },
  { city: "Dubai", country: "United Arab Emirates", lat: 25.2048, lng: 55.2708 },
  { city: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 },
  { city: "Kyoto", country: "Japan", lat: 35.0116, lng: 135.7681 },
  { city: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018 },
  { city: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198 },
  { city: "Bali", country: "Indonesia", lat: -8.4095, lng: 115.1889 },
  { city: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093 },
  { city: "New York", country: "United States", lat: 40.7128, lng: -74.006 },
  { city: "Los Angeles", country: "United States", lat: 34.0522, lng: -118.2437 },
  { city: "Mexico City", country: "Mexico", lat: 19.4326, lng: -99.1332 },
  { city: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lng: -43.1729 },
  { city: "Buenos Aires", country: "Argentina", lat: -34.6037, lng: -58.3816 },
  { city: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832 },
];

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function offlineLookup(lat: number, lng: number): NormalizedPlace {
  let best = FALLBACK_CITIES[0];
  let bestD = Infinity;
  for (const c of FALLBACK_CITIES) {
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (bestD < 250) return { city: best.city, country: best.country };
  return { city: `${lat.toFixed(2)}, ${lng.toFixed(2)}`, country: "Unknown" };
}

/**
 * Cache is keyed to ~11km precision, so hundreds of photos taken across one
 * city collapse to a single reverse-geocode request. In-flight requests are
 * deduplicated too, so concurrent callers never double-fire.
 */
const cache = new Map<string, NormalizedPlace>();
const inflight = new Map<string, Promise<NormalizedPlace>>();
const key = (lat: number, lng: number) => `${lat.toFixed(1)},${lng.toFixed(1)}`;

export async function normalizeLocation(lat: number, lng: number): Promise<NormalizedPlace> {
  const k = key(lat, lng);
  const hit = cache.get(k);
  if (hit) return hit;

  const pending = inflight.get(k);
  if (pending) return pending;

  const task = (async (): Promise<NormalizedPlace> => {
    let place: NormalizedPlace;
    try {
      const { data, error } = await supabase.functions.invoke("reverse-geocode", {
        body: { latitude: lat, longitude: lng },
      });
      if (error || !data?.country) throw new Error("geocode failed");
      place = { city: data.city || data.location_name || "Unknown", country: data.country };
    } catch {
      place = offlineLookup(lat, lng);
    }
    cache.set(k, place);
    inflight.delete(k);
    return place;
  })();

  inflight.set(k, task);
  return task;
}

/**
 * Resolve a batch of coordinates up front with bounded concurrency, so a big
 * import never fires hundreds of simultaneous requests at the edge function.
 */
export async function prewarmLocations(
  coords: { lat: number; lng: number }[],
  concurrency = 4
): Promise<void> {
  const unique = new Map<string, { lat: number; lng: number }>();
  coords.forEach((c) => {
    const k = key(c.lat, c.lng);
    if (!cache.has(k)) unique.set(k, c);
  });

  const queue = [...unique.values()];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    let next = queue.pop();
    while (next) {
      await normalizeLocation(next.lat, next.lng);
      next = queue.pop();
    }
  });
  await Promise.all(workers);
}

