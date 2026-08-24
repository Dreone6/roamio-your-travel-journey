/**
 * Trigger-based permission helpers.
 * Roavr never asks for Location, Camera or Photo Library access during sign-up.
 * These prompts are deferred until the moment a user takes an action that needs
 * them (post a Story, check in, look at Nearby).
 *
 * Native (iOS/Android) requests go through the Capacitor adapters in
 * `@/lib/native`; the browser paths below remain first-class on web.
 */

import { toast } from "sonner";
import { ensureLocationAccess } from "@/lib/native/location";
import { ensureNativeCameraAccess } from "@/lib/native/camera";
import { PERMISSION_COPY, isUsable } from "@/lib/native/permissionCopy";
import { platform } from "@/lib/native/platform";

/**
 * Foreground location only ("when in use"). Never background, never a watch.
 * Returns true when a subsequent position read is allowed to proceed.
 */
export async function ensureLocationPermission(): Promise<boolean> {
  const outcome = await ensureLocationAccess();

  if (outcome === "unavailable") {
    toast.info("Location isn't available on this device.");
    return false;
  }
  if (!isUsable(outcome)) {
    toast.error(PERMISSION_COPY.location.deniedTitle, {
      description:
        outcome === "restricted"
          ? "Location is blocked by this device's restrictions."
          : PERMISSION_COPY.location.deniedBody,
    });
    return false;
  }
  return true;
}

/**
 * Camera access for taking a new photo/video.
 * On web there is no persistent grant — the capture input prompts per use.
 */
export async function ensureCameraPermission(): Promise<boolean> {
  if (!platform.isNative) return typeof navigator !== "undefined";

  const outcome = await ensureNativeCameraAccess();
  if (isUsable(outcome)) return true;
  toast.error(PERMISSION_COPY.camera.deniedTitle, {
    description:
      outcome === "restricted"
        ? "The camera is blocked by this device's restrictions."
        : PERMISSION_COPY.camera.deniedBody,
  });
  return false;
}

/**
 * Photo-library access for choosing existing media.
 * Kept separate from the camera path so a user who only wants to take a photo
 * is never asked for library access (and vice versa).
 */
export async function ensurePhotoPermission(): Promise<boolean> {
  if (!platform.isNative) {
    // Web file pickers grant per-selection access; no upfront prompt exists.
    return typeof navigator !== "undefined";
  }
  const { ensureNativePhotoAccess } = await import("@/lib/native/photos");
  const outcome = await ensureNativePhotoAccess();
  if (isUsable(outcome)) return true;
  toast.error(PERMISSION_COPY.photos.deniedTitle, {
    description:
      outcome === "restricted"
        ? "Photo access is blocked by this device's restrictions."
        : PERMISSION_COPY.photos.deniedBody,
  });
  return false;
}
