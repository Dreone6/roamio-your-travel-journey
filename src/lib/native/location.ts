/**
 * Current-location adapter.
 *
 * Rules Roavr does not break:
 *  - foreground, one-shot reads only — never `watchPosition`, never background
 *    location, never "always" authorization;
 *  - only called from an explicit user gesture (Nearby, deliberate check-in,
 *    location-aware travel utility);
 *  - coordinates stay in memory for the session and are never published or
 *    handed to merchants — offers are matched server-side by distance.
 */
import { Geolocation } from "@capacitor/geolocation";
import { isUsable, type PermissionOutcome } from "./permissionCopy";
import { platform } from "./platform";

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export type LocationStatus = "ok" | "denied" | "restricted" | "unavailable" | "timeout" | "error";

export interface LocationResult {
  status: LocationStatus;
  coords: Coordinates | null;
}

const OPTIONS = { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 };

export function mapLocationPermission(state: string | undefined): PermissionOutcome {
  switch (state) {
    case "granted":
      return "granted";
    case "denied":
      return "denied";
    case "restricted":
      return "restricted";
    default:
      return "granted"; // "prompt" — the OS will ask on use
  }
}

/** Requests foreground ("when in use") location permission only. */
export async function ensureLocationAccess(): Promise<PermissionOutcome> {
  if (platform.isNative) {
    try {
      const current = await Geolocation.checkPermissions();
      let state = current.location;
      if (state === "prompt" || state === "prompt-with-rationale") {
        const asked = await Geolocation.requestPermissions({ permissions: ["location"] });
        state = asked.location;
      }
      return mapLocationPermission(state);
    } catch {
      return "unavailable";
    }
  }

  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return "unavailable";
  try {
    if ("permissions" in navigator) {
      const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      return mapLocationPermission(status.state);
    }
  } catch {
    /* Safari/Firefox may not support querying geolocation */
  }
  return "granted";
}

function browserPosition(): Promise<LocationResult> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          status: "ok",
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          },
        }),
      (err) =>
        resolve({
          status: err?.code === err?.PERMISSION_DENIED ? "denied" : err?.code === 3 ? "timeout" : "error",
          coords: null,
        }),
      OPTIONS,
    );
  });
}

/**
 * One-shot current position. Must be called from a user gesture.
 * Never throws — callers branch on `status`.
 */
export async function getCurrentLocation(): Promise<LocationResult> {
  const access = await ensureLocationAccess();
  if (!isUsable(access)) {
    const status: LocationStatus =
      access === "denied" || access === "restricted" || access === "unavailable" ? access : "error";
    return { status, coords: null };
  }

  if (platform.isNative) {
    try {
      const pos = await Geolocation.getCurrentPosition(OPTIONS);
      return {
        status: "ok",
        coords: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        },
      };
    } catch (err) {
      const message = String((err as Error)?.message ?? "").toLowerCase();
      if (message.includes("denied") || message.includes("permission")) {
        return { status: "denied", coords: null };
      }
      if (message.includes("time")) return { status: "timeout", coords: null };
      return { status: "error", coords: null };
    }
  }

  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return { status: "unavailable", coords: null };
  }
  return browserPosition();
}
