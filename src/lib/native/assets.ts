/**
 * Native asset -> Blob resolution.
 *
 * Capacitor hands back several representations of the same picked asset:
 *   - `path`     : the on-device file path (iOS/Android). Best fidelity — this is
 *                  the copy that still carries EXIF (GPS + capture date).
 *   - `webPath`  : a `capacitor://`/`http://localhost` URL the webview can fetch.
 *   - `dataUrl`  : base64, only when explicitly requested.
 *
 * Build My World depends on EXIF, so we always try `path` (converted with
 * `Capacitor.convertFileSrc`) before falling back to `webPath`. Dropping to
 * `webPath` first would silently lose metadata on some Android OEM pickers.
 */
import { Capacitor } from "@capacitor/core";

export interface NativeAssetRef {
  path?: string;
  webPath?: string;
  format?: string;
}

export function assetSrcCandidates(asset: NativeAssetRef): string[] {
  const candidates: string[] = [];
  if (asset.path) {
    try {
      candidates.push(Capacitor.convertFileSrc(asset.path));
    } catch {
      /* convertFileSrc is unavailable on web */
    }
  }
  if (asset.webPath) candidates.push(asset.webPath);
  return candidates.filter((c, i, arr) => !!c && arr.indexOf(c) === i);
}

/** Fetches the first representation that resolves. Returns null if none do. */
export async function assetToBlob(asset: NativeAssetRef): Promise<Blob | null> {
  for (const src of assetSrcCandidates(asset)) {
    try {
      const res = await fetch(src);
      if (!res.ok) continue;
      const blob = await res.blob();
      if (blob.size > 0) return blob;
    } catch {
      /* try the next representation */
    }
  }
  return null;
}

export function assetFileName(asset: NativeAssetRef, index: number): string {
  const fromPath = (asset.path || asset.webPath || "").split("?")[0].split("/").pop();
  if (fromPath && fromPath.includes(".")) return decodeURIComponent(fromPath);
  return `photo-${index + 1}.${asset.format || "jpg"}`;
}

/** Runs `task` over `items` with bounded concurrency so 1,000-photo picks don't OOM. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  let done = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index], index);
      done++;
      onProgress?.(done, items.length);
    }
  });

  await Promise.all(workers);
  return results;
}
