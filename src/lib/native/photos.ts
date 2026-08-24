/**
 * Native photo-library adapter (iOS / Android).
 *
 * Least privilege by design: Roavr uses the *picker* (`pickImages`), which on
 * iOS 14+ and Android 13+ grants access only to the assets the user selected.
 * Roavr never asks for unrestricted library access, never reads the library in
 * the background, and never uploads a picked photo — Build My World only reads
 * EXIF locally and persists the resulting visit metadata.
 */
import { Camera } from "@capacitor/camera";
import type { MediaItem } from "@/lib/buildworld/types";
import { MAX_MEDIA_PER_SCAN } from "@/lib/buildworld/metadata";
import { assetFileName, assetToBlob, mapWithConcurrency, type NativeAssetRef } from "./assets";
import { isUsable, type PermissionOutcome } from "./permissionCopy";
import { platform } from "./platform";

export type PickStatus =
  | "ok"
  | "cancelled"
  | "denied"
  | "restricted"
  | "unavailable"
  /** Assets were selected but none could be read back from the OS. */
  | "unreadable";

export interface NativePickResult {
  status: PickStatus;
  items: MediaItem[];
  /** Selected assets dropped because the pick exceeded MAX_MEDIA_PER_SCAN. */
  truncated: number;
  /** Selected assets the OS refused to hand back as bytes. */
  failed: number;
  /** True when the OS granted access to a user-chosen subset of the library. */
  limited: boolean;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function isNativePhotoLibraryAvailable(): boolean {
  return platform.isNative;
}

/** Maps Capacitor's permission vocabulary onto Roavr's PermissionOutcome. */
export function mapPhotoPermission(state: string | undefined): PermissionOutcome {
  switch (state) {
    case "granted":
      return "granted";
    case "limited":
      return "limited";
    case "denied":
      return "denied";
    case "restricted":
      return "restricted";
    default:
      // "prompt" / "prompt-with-rationale" — usable, the OS will ask on use.
      return "granted";
  }
}

/** Checks (and if needed requests) photo access, explaining nothing itself. */
export async function ensureNativePhotoAccess(): Promise<PermissionOutcome> {
  if (!platform.isNative) return "unavailable";
  try {
    const current = await Camera.checkPermissions();
    let state = current.photos;
    if (state === "prompt" || state === "prompt-with-rationale") {
      const asked = await Camera.requestPermissions({ permissions: ["photos"] });
      state = asked.photos;
    }
    return mapPhotoPermission(state);
  } catch {
    return "unavailable";
  }
}

/** Converts raw picker results into pipeline-ready MediaItems. */
export async function assetsToMediaItems(
  assets: NativeAssetRef[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ items: MediaItem[]; failed: number }> {
  const resolved = await mapWithConcurrency(
    assets,
    4,
    async (asset, index) => {
      const blob = await assetToBlob(asset);
      if (!blob) return null;
      const item: MediaItem = {
        id: uid(),
        name: assetFileName(asset, index),
        blob,
        // webPath renders directly in the webview — no extra object URL to leak.
        previewUrl: asset.webPath,
      };
      return item;
    },
    onProgress,
  );

  const items = resolved.filter((i): i is MediaItem => i !== null);
  return { items, failed: resolved.length - items.length };
}

/**
 * Opens the OS photo picker and returns Build My World media items.
 * Never throws — every failure mode is expressed as a `PickStatus`.
 */
export async function pickNativePhotos(
  onProgress?: (done: number, total: number) => void,
): Promise<NativePickResult> {
  const empty: Omit<NativePickResult, "status"> = {
    items: [],
    truncated: 0,
    failed: 0,
    limited: false,
  };

  if (!platform.isNative) return { status: "unavailable", ...empty };

  const access = await ensureNativePhotoAccess();
  if (!isUsable(access)) {
    return {
      status: access === "restricted" ? "restricted" : access === "unavailable" ? "unavailable" : "denied",
      ...empty,
    };
  }

  let assets: NativeAssetRef[];
  try {
    // limit: 0 = "as many as you like"; Roavr caps the scan itself below.
    const result = await Camera.pickImages({ quality: 100, limit: 0 });
    assets = result.photos ?? [];
  } catch (err) {
    const message = String((err as Error)?.message ?? err ?? "").toLowerCase();
    if (message.includes("denied") || message.includes("permission")) {
      return { status: "denied", ...empty };
    }
    // The picker rejects on user cancel on both platforms.
    return { status: "cancelled", ...empty };
  }

  if (assets.length === 0) return { status: "cancelled", ...empty, limited: access === "limited" };

  const truncated = Math.max(0, assets.length - MAX_MEDIA_PER_SCAN);
  const capped = truncated > 0 ? assets.slice(0, MAX_MEDIA_PER_SCAN) : assets;

  const { items, failed } = await assetsToMediaItems(capped, onProgress);

  return {
    status: items.length > 0 ? "ok" : "unreadable",
    items,
    truncated,
    failed,
    limited: access === "limited",
  };
}

/**
 * iOS "Selected Photos" mode: lets the user widen their selection without
 * going to Settings. No-op elsewhere.
 */
export async function expandLimitedSelection(): Promise<void> {
  if (!platform.isIOS) return;
  try {
    await Camera.pickLimitedLibraryPhotos();
  } catch {
    /* not in limited mode, or the sheet was dismissed */
  }
}
