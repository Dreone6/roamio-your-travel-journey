/**
 * Media selection layer — the ONLY browser-coupled stage of Build My World.
 *
 * Replace/augment with a Capacitor implementation later:
 *   export const nativePhotoLibrarySource: MediaSource = { id: "native", ... }
 * Everything downstream consumes `MediaItem[]` and stays unchanged.
 */
import type { MediaItem, MediaSource } from "./types";
import { DEMO_MEDIA } from "./demoDataset";

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

/** Native photo library — not wired yet, kept so callers can feature-detect. */
export const nativePhotoLibrarySource: MediaSource = {
  id: "native",
  label: "Scan my photo library",
  isAvailable: () => false,
  pickMedia: async () => [],
};

export const MEDIA_SOURCES: MediaSource[] = [
  nativePhotoLibrarySource,
  browserFileSource,
  demoSource,
];
