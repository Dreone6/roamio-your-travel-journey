/**
 * Metadata extraction — reads GPS + capture date from selected media.
 * Reuses exifr (same dependency the Story capture flow uses).
 */
import exifr from "exifr";
import type { GeotaggedMedia, MediaItem } from "./types";

export interface ExtractionResult {
  geotagged: GeotaggedMedia[];
  scanned: number;
  skipped: number;
}

export async function extractMetadata(
  items: MediaItem[],
  onProgress?: (scanned: number, total: number, found: number) => void
): Promise<ExtractionResult> {
  const geotagged: GeotaggedMedia[] = [];
  let scanned = 0;

  for (const item of items) {
    scanned++;

    if (item.knownLatitude != null && item.knownLongitude != null) {
      geotagged.push({
        id: item.id,
        name: item.name,
        latitude: item.knownLatitude,
        longitude: item.knownLongitude,
        takenAt: item.knownTakenAt ?? new Date().toISOString(),
        previewUrl: item.previewUrl,
        city: item.knownCity,
        country: item.knownCountry,
      });
    } else if (item.blob) {
      try {
        const meta = await exifr.parse(item.blob, {
          gps: true,
          pick: ["latitude", "longitude", "DateTimeOriginal", "CreateDate"],
        });
        if (meta && typeof meta.latitude === "number" && typeof meta.longitude === "number") {
          const taken = meta.DateTimeOriginal || meta.CreateDate;
          geotagged.push({
            id: item.id,
            name: item.name,
            latitude: meta.latitude,
            longitude: meta.longitude,
            takenAt: taken ? new Date(taken).toISOString() : new Date().toISOString(),
            previewUrl: item.previewUrl,
          });
        }
      } catch {
        // Unreadable metadata — skip silently, it's expected for many files.
      }
    }

    if (scanned % 3 === 0 || scanned === items.length) {
      onProgress?.(scanned, items.length, geotagged.length);
      // Yield to the paint loop so counters animate smoothly.
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return { geotagged, scanned, skipped: scanned - geotagged.length };
}
