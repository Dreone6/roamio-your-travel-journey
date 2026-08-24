/**
 * Capture adapter — "take something new" vs "choose something existing".
 *
 * These are deliberately separate entry points with separate permissions:
 *   takePhoto()        -> Camera permission only
 *   chooseFromLibrary()-> Photo library permission only
 *   recordVideo()      -> native camera video (browser capture input fallback)
 *
 * Build My World library scanning lives in `photos.ts` and never routes through
 * here, so a user who only wants to post a Story is never asked for library
 * access, and a user building their World is never asked for camera access.
 */
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { assetFileName, assetToBlob } from "./assets";
import { isUsable, type PermissionOutcome } from "./permissionCopy";
import { mapPhotoPermission } from "./photos";
import { platform } from "./platform";

export type CaptureStatus = "ok" | "cancelled" | "denied" | "restricted" | "unavailable" | "unreadable";

export interface CaptureResult {
  status: CaptureStatus;
  file: File | null;
}

const CANCEL_HINTS = ["cancel", "no image picked", "user cancelled"];

export function isNativeCameraAvailable(): boolean {
  return platform.isNative;
}

export async function ensureNativeCameraAccess(): Promise<PermissionOutcome> {
  if (!platform.isNative) return "unavailable";
  try {
    const current = await Camera.checkPermissions();
    let state = current.camera;
    if (state === "prompt" || state === "prompt-with-rationale") {
      const asked = await Camera.requestPermissions({ permissions: ["camera"] });
      state = asked.camera;
    }
    return mapPhotoPermission(state);
  } catch {
    return "unavailable";
  }
}

async function getPhoto(source: CameraSource): Promise<CaptureResult> {
  try {
    const photo = await Camera.getPhoto({
      quality: 92,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      // Roavr never writes captures into the user's camera roll silently.
      saveToGallery: false,
      source,
    });
    const blob = await assetToBlob(photo);
    if (!blob) return { status: "unreadable", file: null };
    const name = assetFileName(photo, 0);
    return {
      status: "ok",
      file: new File([blob], name, { type: blob.type || `image/${photo.format || "jpeg"}` }),
    };
  } catch (err) {
    const message = String((err as Error)?.message ?? err ?? "").toLowerCase();
    if (CANCEL_HINTS.some((hint) => message.includes(hint))) return { status: "cancelled", file: null };
    if (message.includes("denied") || message.includes("permission")) return { status: "denied", file: null };
    return { status: "cancelled", file: null };
  }
}

/** Take a NEW photo with the device camera. Camera permission only. */
export async function takePhoto(): Promise<CaptureResult> {
  if (!platform.isNative) return { status: "unavailable", file: null };
  const access = await ensureNativeCameraAccess();
  if (!isUsable(access)) {
    return { status: access === "restricted" ? "restricted" : "denied", file: null };
  }
  return getPhoto(CameraSource.Camera);
}

/** Choose ONE existing photo. Photo-library permission only. */
export async function chooseFromLibrary(): Promise<CaptureResult> {
  if (!platform.isNative) return { status: "unavailable", file: null };
  return getPhoto(CameraSource.Photos);
}

/**
 * Video capture is not covered by @capacitor/camera. The browser capture input
 * is the correct path on all platforms today (the native webview hands it to the
 * system camera), so the caller keeps its existing `<input capture>` fallback.
 */
export const NATIVE_VIDEO_CAPTURE_SUPPORTED = false;
