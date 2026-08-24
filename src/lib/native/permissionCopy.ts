/**
 * Permission education copy.
 *
 * Roavr always explains WHY before the OS prompt appears. Every capability has
 * exactly one purpose string and Roavr never asks for a capability that the
 * current action does not need.
 */

export const PERMISSION_COPY = {
  photos: {
    title: "Build your World from places you've been",
    body:
      "Roavr reads only the location and date stored inside the photos you pick. Photos stay on your device during the scan — nothing is uploaded.",
    cta: "Choose photos",
    deniedTitle: "Photo access is off",
    deniedBody:
      "Enable photo access in Settings to build your World, or add places manually instead.",
  },
  camera: {
    title: "Capture travel memories",
    body: "Roavr uses the camera only when you take a photo or video yourself.",
    cta: "Open camera",
    deniedTitle: "Camera access is off",
    deniedBody: "Enable camera access in Settings, or choose an existing photo instead.",
  },
  location: {
    title: "Find relevant experiences nearby when you choose",
    body:
      "Roavr checks your location only when you tap for it. It is never tracked in the background and never shared automatically.",
    cta: "Use my location",
    deniedTitle: "Location access is off",
    deniedBody:
      "Enable location in Settings to see nearby offers, or keep browsing by destination.",
  },
} as const;

export type PermissionCapability = keyof typeof PERMISSION_COPY;

/** Outcome shared by every native capability adapter. */
export type PermissionOutcome =
  | "granted"
  /** iOS "Selected Photos" / Android partial media access — fully supported. */
  | "limited"
  | "denied"
  /** Blocked by OS policy or MDM; the user cannot grant it from Settings. */
  | "restricted"
  | "unavailable";

export function isUsable(outcome: PermissionOutcome): boolean {
  return outcome === "granted" || outcome === "limited";
}
