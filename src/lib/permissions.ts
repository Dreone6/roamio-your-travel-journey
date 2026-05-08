/**
 * Trigger-based permission helpers.
 * Roavr never asks for Location or Photo Library access during sign-up.
 * These prompts are deferred until the moment a user takes an action that needs them
 * (e.g. Post to Story, View the Globe).
 */

import { toast } from "sonner";

type PermissionName = "geolocation" | "camera";

async function queryPermission(name: PermissionName): Promise<PermissionState | "unknown"> {
  try {
    if (typeof navigator === "undefined" || !("permissions" in navigator)) return "unknown";
    // @ts-expect-error - camera is supported on most browsers but not in lib types
    const status = await navigator.permissions.query({ name });
    return status.state;
  } catch {
    return "unknown";
  }
}

export async function ensureLocationPermission(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    toast.info("Location isn't available on this device.");
    return false;
  }

  const state = await queryPermission("geolocation");
  if (state === "granted") return true;
  if (state === "denied") {
    toast.error("Location access blocked", {
      description: "Enable location in your browser settings to use this feature.",
    });
    return false;
  }

  // Triggers the native prompt
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => {
        toast.error("Location access denied", {
          description: "We need location to place your pin and personalize your map.",
        });
        resolve(false);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  });
}

export async function ensurePhotoPermission(): Promise<boolean> {
  // Web has no persistent "photo library" permission — file pickers grant per-selection access.
  // On native (Capacitor), this would gate Photos plugin access; the input fallback works on web.
  if (typeof navigator === "undefined") return false;

  const state = await queryPermission("camera");
  if (state === "denied") {
    toast.error("Camera access blocked", {
      description: "Enable camera access in your browser settings to capture or pick photos.",
    });
    return false;
  }
  // For file selection from the library we don't need an upfront prompt.
  return true;
}
