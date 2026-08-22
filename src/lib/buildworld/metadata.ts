/**
 * Metadata extraction — reads GPS + capture date from selected media.
 * Reuses exifr (same dependency the Story capture flow uses).
 *
 * Failure handling: unreadable files, files without GPS and files without a
 * capture timestamp are all expected. Items without GPS are skipped (counted
 * as `skipped`); items with GPS but no timestamp survive with
 * `takenAtKnown: false` so clustering can group them by location alone.
 */
import exifr from "exifr";
import type { GeotaggedMedia, MediaItem } from "./types";

/** Hard ceiling so an accidental 5,000-photo selection can't lock the tab. */
export const MAX_MEDIA_PER_SCAN = 1500;

export interface ExtractionResult {
  geotagged: GeotaggedMedia[];
  scanned: number;
  skipped: number;
  /** Items dropped because the selection exceeded MAX_MEDIA_PER_SCAN. */
  truncated: number;
  /** Geotagged items whose capture date had to be guessed. */
  undated: number;
}

export async function extractMetadata(
  items: MediaItem[],
  onProgress?: (scanned: number, total: number, found: number) => void
): Promise<ExtractionResult> {
  const truncated = Math.max(0, items.length - MAX_MEDIA_PER_SCAN);
  const list = truncated > 0 ? items.slice(0, MAX_MEDIA_PER_SCAN) : items;

  const geotagged: GeotaggedMedia[] = [];
  let scanned = 0;
  let undated = 0;

  for (const item of list) {
    scanned++;

    if (item.knownLatitude != null && item.knownLongitude != null) {
      geotagged.push({
        id: item.id,
        name: item.name,
        latitude: item.knownLatitude,
        longitude: item.knownLongitude,
        takenAt: item.knownTakenAt ?? new Date().toISOString(),
        takenAtKnown: item.knownTakenAt != null,
        previewUrl: item.previewUrl,
        city: item.knownCity,
        country: item.knownCountry,
      });
      if (item.knownTakenAt == null) undated++;
    } else if (item.blob) {
      try {
        const meta = await exifr.parse(item.blob, {
          gps: true,
          pick: ["latitude", "longitude", "DateTimeOriginal", "CreateDate"],
        });
        if (meta && typeof meta.latitude === "number" && typeof meta.longitude === "number") {
          const taken = meta.DateTimeOriginal || meta.CreateDate;
          const parsed = taken ? new Date(taken) : null;
          const valid = parsed && !Number.isNaN(parsed.getTime());
          if (!valid) undated++;
          geotagged.push({
            id: item.id,
            name: item.name,
            latitude: meta.latitude,
            longitude: meta.longitude,
            takenAt: valid ? parsed!.toISOString() : new Date().toISOString(),
            takenAtKnown: !!valid,
            previewUrl: item.previewUrl,
          });
        }
      } catch {
        // Unreadable metadata — skip silently, it's expected for many files.
      }
    }

    if (scanned % 3 === 0 || scanned === list.length) {
      onProgress?.(scanned, list.length, geotagged.length);
      // Yield to the paint loop so counters animate smoothly.
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return { geotagged, scanned, skipped: scanned - geotagged.length, truncated, undated };
}
