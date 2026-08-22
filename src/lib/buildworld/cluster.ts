/**
 * Trip clustering — geotagged media -> probable trips.
 * A trip = photos within ~120km of each other, with no gap larger than 5 days.
 */
import { haversineKm, normalizeLocation } from "./geocode";
import type { DiscoveredTrip, GeotaggedMedia } from "./types";

const RADIUS_KM = 120;
const MAX_GAP_DAYS = 5;

interface RawCluster {
  media: GeotaggedMedia[];
  lat: number;
  lng: number;
}

export function clusterMedia(media: GeotaggedMedia[]): RawCluster[] {
  const sorted = [...media].sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  const clusters: RawCluster[] = [];

  for (const m of sorted) {
    const match = clusters.find((c) => {
      if (haversineKm(c.lat, c.lng, m.latitude, m.longitude) > RADIUS_KM) return false;
      const last = c.media[c.media.length - 1];
      const gap = Math.abs(new Date(m.takenAt).getTime() - new Date(last.takenAt).getTime());
      return gap <= MAX_GAP_DAYS * 86400000;
    });

    if (match) {
      match.media.push(m);
      match.lat = match.media.reduce((s, x) => s + x.latitude, 0) / match.media.length;
      match.lng = match.media.reduce((s, x) => s + x.longitude, 0) / match.media.length;
    } else {
      clusters.push({ media: [m], lat: m.latitude, lng: m.longitude });
    }
  }

  return clusters;
}

export async function buildDiscoveredTrips(
  media: GeotaggedMedia[],
  onProgress?: (done: number, total: number) => void
): Promise<DiscoveredTrip[]> {
  const clusters = clusterMedia(media);
  const trips: DiscoveredTrip[] = [];

  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i];
    const known = c.media.find((m) => m.city && m.country);
    const place = known
      ? { city: known.city!, country: known.country! }
      : await normalizeLocation(c.lat, c.lng);

    const dates = c.media.map((m) => m.takenAt).sort();
    trips.push({
      id: `trip-${i}-${Math.round(c.lat * 100)}-${Math.round(c.lng * 100)}`,
      city: place.city,
      country: place.country,
      latitude: c.lat,
      longitude: c.lng,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      memoryCount: c.media.length,
      thumbnails: c.media.map((m) => m.previewUrl).filter(Boolean).slice(0, 3) as string[],
      selected: true,
      visibility: "private",
      mediaIds: c.media.map((m) => m.id),
    });
    onProgress?.(i + 1, clusters.length);
  }

  return trips.sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export function mergeTrips(trips: DiscoveredTrip[], ids: string[]): DiscoveredTrip[] {
  const targets = trips.filter((t) => ids.includes(t.id));
  if (targets.length < 2) return trips;

  const merged: DiscoveredTrip = {
    ...targets[0],
    id: targets[0].id,
    memoryCount: targets.reduce((s, t) => s + t.memoryCount, 0),
    thumbnails: targets.flatMap((t) => t.thumbnails).slice(0, 3),
    startDate: targets.map((t) => t.startDate).sort()[0],
    endDate: targets.map((t) => t.endDate).sort().reverse()[0],
    latitude: targets.reduce((s, t) => s + t.latitude, 0) / targets.length,
    longitude: targets.reduce((s, t) => s + t.longitude, 0) / targets.length,
    mediaIds: targets.flatMap((t) => t.mediaIds),
  };

  const rest = trips.filter((t) => !ids.includes(t.id));
  return [merged, ...rest].sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export function summarize(trips: DiscoveredTrip[]) {
  const selected = trips.filter((t) => t.selected);
  return {
    trips: selected.length,
    memories: selected.reduce((s, t) => s + t.memoryCount, 0),
    cities: new Set(selected.map((t) => `${t.city}|${t.country}`)).size,
    countries: new Set(selected.map((t) => t.country)).size,
  };
}

export function formatRange(startISO: string, endISO: string): string {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (sameMonth) {
    return `${s.toLocaleDateString(undefined, opts)}–${e.getDate()}, ${e.getFullYear()}`;
  }
  return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, { ...opts, year: "numeric" })}`;
}
