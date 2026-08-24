/**
 * Story media duration rules.
 *
 * Two different numbers are easy to confuse:
 *  - a PHOTO's duration is a *display* duration the poster chooses (1–30s);
 *  - a VIDEO's duration is a *real* property of the file (max 60s).
 *
 * Roavr does not trim video. So an over-limit clip is REJECTED with a clear
 * message rather than silently stored with a cosmetic `duration_seconds` that
 * lies about the file.
 */

export const PHOTO_DURATION_MIN = 1;
export const PHOTO_DURATION_MAX = 30;
export const PHOTO_DURATION_DEFAULT = 5;
export const VIDEO_DURATION_MAX = 60;
export const VIDEO_DURATION_DEFAULT = 15;

/** Small slack for container rounding (a "60s" clip often reports 60.04s). */
const TOLERANCE_SECONDS = 0.5;

export interface DurationCheck {
  ok: boolean;
  /** Real duration in seconds, or null when the browser could not read it. */
  seconds: number | null;
  reason?: string;
}

/** Reads the true duration of a video file via a detached media element. */
export function readVideoDuration(file: Blob): Promise<number | null> {
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      resolve(value);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () =>
      finish(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null);
    video.onerror = () => finish(null);
    // Some codecs never fire metadata events; don't hang the post button.
    setTimeout(() => finish(null), 8000);
    video.src = url;
  });
}

export function evaluateDuration(seconds: number | null, isVideo: boolean): DurationCheck {
  if (!isVideo) return { ok: true, seconds };
  if (seconds == null) {
    // Unknown duration: allow, but never claim it was trimmed.
    return { ok: true, seconds: null };
  }
  if (seconds > VIDEO_DURATION_MAX + TOLERANCE_SECONDS) {
    return {
      ok: false,
      seconds,
      reason: `That clip is ${Math.round(seconds)}s. Stories accept videos up to ${VIDEO_DURATION_MAX}s — trim it in your camera app and try again.`,
    };
  }
  return { ok: true, seconds };
}

/** Convenience: read + evaluate a picked file in one call. */
export async function checkStoryMedia(file: Blob | null, isVideo: boolean): Promise<DurationCheck> {
  if (!file || !isVideo) return { ok: true, seconds: null };
  const seconds = await readVideoDuration(file);
  return evaluateDuration(seconds, true);
}

/** Clamps the poster-chosen display duration to the allowed range. */
export function clampDisplayDuration(value: number, isVideo: boolean, realSeconds: number | null): number {
  if (isVideo) {
    const cap = Math.min(VIDEO_DURATION_MAX, realSeconds ? Math.ceil(realSeconds) : VIDEO_DURATION_MAX);
    return Math.max(1, Math.min(cap, Math.round(value)));
  }
  return Math.max(PHOTO_DURATION_MIN, Math.min(PHOTO_DURATION_MAX, Math.round(value)));
}
