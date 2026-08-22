/**
 * Build My World — shared contracts.
 *
 * The pipeline is intentionally split into swappable stages:
 *   media selection -> metadata extraction -> location normalization
 *   -> trip clustering -> persistence -> UI
 *
 * Only `mediaSource.ts` knows about browser APIs. A future Capacitor
 * photo-library module implements the same `MediaSource` interface and
 * nothing downstream has to change.
 */

export type Visibility = "private" | "followers" | "public";

/** A single selected media item, before any metadata is read. */
export interface MediaItem {
  id: string;
  name: string;
  /** Present for real file selections. Absent for demo items. */
  blob?: Blob;
  /** Optional preview (object URL or remote URL). */
  previewUrl?: string;
  /** Demo/native sources may already know the coordinates. */
  knownLatitude?: number;
  knownLongitude?: number;
  knownTakenAt?: string;
  knownCity?: string;
  knownCountry?: string;
}

/** Media item after metadata extraction. Only geotagged items survive. */
export interface GeotaggedMedia {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  takenAt: string;
  previewUrl?: string;
  city?: string;
  country?: string;
}

export interface NormalizedPlace {
  city: string;
  country: string;
}

/** A probable trip: one city, one date range, N memories. */
export interface DiscoveredTrip {
  id: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  memoryCount: number;
  thumbnails: string[];
  selected: boolean;
  visibility: Visibility;
  mediaIds: string[];
  /**
   * Stable fingerprint of this visit (coarse location + date window).
   * Used for duplicate-import protection — never derived from filenames.
   */
  importKey: string;
  /** True when no photo in the cluster had a usable capture date. */
  dateUnknown: boolean;
}


export interface ScanCounters {
  photos: number;
  locations: number;
  cities: number;
  countries: number;
}

export type MediaSourceId = "browser" | "demo" | "native";

/** Swappable media provider. Browser today, Capacitor later. */
export interface MediaSource {
  id: MediaSourceId;
  label: string;
  isAvailable(): boolean;
  /** Resolves with the user's selection. Empty array when cancelled. */
  pickMedia(): Promise<MediaItem[]>;
}
