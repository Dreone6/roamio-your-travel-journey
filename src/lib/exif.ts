import exifr from "exifr";
import { ensureLocationPermission } from "./permissions";
import { getCurrentLocation } from "./native/location";

export interface PhotoLocation {
  latitude: number;
  longitude: number;
  source: "exif" | "device" | "none";
  takenAt?: string;
}

/**
 * Auto-geotag a photo for the 24-hour Story flow.
 * 1. Try EXIF GPS embedded in the image (most accurate, taken at capture time).
 * 2. Fallback to live device geolocation (trigger-based permission prompt).
 * 3. Return null if neither is available.
 */
export async function geotagPhoto(file: File | Blob | null): Promise<PhotoLocation | null> {
  if (file) {
    try {
      const meta = await exifr.parse(file, { gps: true, pick: ["latitude", "longitude", "DateTimeOriginal"] });
      if (meta && typeof meta.latitude === "number" && typeof meta.longitude === "number") {
        return {
          latitude: meta.latitude,
          longitude: meta.longitude,
          source: "exif",
          takenAt: meta.DateTimeOriginal ? new Date(meta.DateTimeOriginal).toISOString() : undefined,
        };
      }
    } catch {
      // ignore — fall back to device location
    }
  }

  const ok = await ensureLocationPermission();
  if (!ok) return null;

  const { status, coords } = await getCurrentLocation();
  if (status !== "ok" || !coords) return null;
  return { latitude: coords.latitude, longitude: coords.longitude, source: "device" };
}
