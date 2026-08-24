/**
 * Media selection layer — the ONLY device-coupled stage of Build My World.
 *
 * `nativePhotoLibrarySource` (iOS/Android) and `browserFileSource` (web) both
 * emit `MediaItem[]`; every downstream stage — metadata extraction,
 * normalization, clustering, review, dedupe, persistence, World reveal — is
 * shared and untouched by which source produced the items.
 */
import type { MediaItem, MediaSource } from "./types";
import { DEMO_MEDIA } from "./demoDataset";
import {
  isNativePhotoLibraryAvailable,
  pickNativePhotos,
  type NativePickResult,
} from "@/lib/native/photos";


const uid = () => Math.random().toString(36).slice(2, 10);

export const browserFileSource: MediaSource = {
  id: "browser",
  label: "Choose photos",
  isAvailable: () => typeof document !== "undefined",
  pickMedia: () =>
    new Promise<MediaItem[]>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.multiple = true;
      input.style.display = "none";
      document.body.appendChild(input);

      let settled = false;
      const done = (items: MediaItem[]) => {
        if (settled) return;
        settled = true;
        input.remove();
        resolve(items);
      };

      input.onchange = () => done(filesToMediaItems(Array.from(input.files ?? [])));
      // Browsers give no reliable "cancel" event; window focus is the best proxy.
      window.addEventListener(
        "focus",
        () => setTimeout(() => done([]), 800),
        { once: true }
      );
      input.click();
    }),
};

export function filesToMediaItems(files: File[]): MediaItem[] {
  return files.map((f) => ({
    id: uid(),
    name: f.name,
    blob: f,
    previewUrl: URL.createObjectURL(f),
  }));
}

/**
 * Demo source — isolated sample travel history for demonstrating the flow.
 * Only reachable when the user explicitly enables demo mode; it never mixes
 * with real photo selections and is flagged on persistence.
 */
export const demoSource: MediaSource = {
  id: "demo",
  label: "Run a demo scan",
  isAvailable: () => true,
  pickMedia: async () => DEMO_MEDIA.map((m) => ({ ...m, id: uid() })),
};

/**
 * Native photo library (Capacitor). Uses the OS picker so only the assets the
 * user selected are ever readable — Roavr never requests full-library access.
 * The richer result (denied / limited / truncated) is available via
 * `pickNativeMedia`; `pickMedia` keeps the plain MediaSource contract.
 */
export const nativePhotoLibrarySource: MediaSource = {
  id: "native",
  label: "Scan my photo library",
  isAvailable: () => isNativePhotoLibraryAvailable(),
  pickMedia: async () => (await pickNativePhotos()).items,
};

/** Full-fidelity native pick — the UI needs the status to explain outcomes. */
export async function pickNativeMedia(
  onProgress?: (done: number, total: number) => void,
): Promise<NativePickResult> {
  return pickNativePhotos(onProgress);
}


export const MEDIA_SOURCES: MediaSource[] = [
  nativePhotoLibrarySource,
  browserFileSource,
  demoSource,
];
